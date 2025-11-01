"""Alert triage worker

Runtime: Python script that can run locally (Docker/virtualenv) or as an AWS Lambda/ECS task.

Responsibilities
----------------
* Poll an SQS queue for alert payloads.
* Fetch the shared BACKEND_TOKEN secret from AWS Secrets Manager (or env fallback).
* Call an LLM to transform raw alert JSON into a structured ticket payload.
* POST the ticket payload to the backend `/api/service/tickets` endpoint, using the
  service token for authorization.
* Emit CloudWatch metrics for observability.

For local demos you can point the AWS SDK clients at LocalStack by setting `AWS_ENDPOINT_URL`.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict, Optional

import boto3
import requests
from botocore.exceptions import BotoCoreError, ClientError

try:  # Prefer the modern OpenAI SDK (>=1.0)
    from openai import OpenAI
except ImportError:  # Fall back to the classic SDK for compatibility
    OpenAI = None  # type: ignore
    import openai  # type: ignore

from tenacity import retry, stop_after_attempt, wait_exponential

from .config import WorkerConfig

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class AlertTriageWorker:
    """Worker that triages alerts into tickets using an LLM."""

    def __init__(self, config: WorkerConfig):
        config.validate()
        self.config = config

        common_kwargs = {
            "region_name": self.config.aws_region,
        }
        if self.config.sqs_endpoint_url:
            common_kwargs["endpoint_url"] = self.config.sqs_endpoint_url

        self.sqs = boto3.client("sqs", **common_kwargs)

        self.secrets_manager = None
        if self.config.secrets_manager_secret_id:
            self.secrets_manager = boto3.client("secretsmanager", **common_kwargs)

        cloudwatch_kwargs = common_kwargs.copy()
        if self.config.cloudwatch_endpoint_url:
            cloudwatch_kwargs["endpoint_url"] = self.config.cloudwatch_endpoint_url
        self.cloudwatch = boto3.client("cloudwatch", **cloudwatch_kwargs)

        self._backend_token_cache: Optional[str] = None
        self._openai_client = self._init_openai_client()

    def _init_openai_client(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not set. Worker will use fallback heuristics.")
            return None

        if OpenAI is not None:
            return OpenAI()

        # Classic SDK fallback
        openai.api_key = api_key  # type: ignore
        return openai  # type: ignore

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_forever(self):
        """Continuously poll the queue for new alerts."""
        logger.info("Starting alert triage worker: queue=%s", self.config.sqs_queue_url)
        while True:
            try:
                self._poll_once()
            except Exception as exc:  # pylint: disable=broad-except
                logger.exception("Unexpected error while polling queue: %s", exc)
                time.sleep(5)

    def process_alert_payload(self, alert_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single alert payload and return the ticket payload if created."""
        ticket_payload = self._build_ticket_payload(alert_payload)
        if not ticket_payload:
            logger.error("Failed to build ticket payload from alert: %s", alert_payload)
            self._publish_metric("SummarizationFailures", 1)
            return None

        backend_token = self._fetch_backend_token()
        if not backend_token:
            logger.error("No BACKEND_TOKEN available; aborting ticket creation.")
            self._publish_metric("SummarizationFailures", 1)
            return None

        created = self._post_ticket(ticket_payload, backend_token)
        if created:
            self._publish_metric("TicketsCreated", 1)
            logger.info("Created ticket: %s", created.get("id"))
            return created

        self._publish_metric("SummarizationFailures", 1)
        return None

    # ------------------------------------------------------------------
    # Core internals
    # ------------------------------------------------------------------

    def _poll_once(self) -> None:
        response = self.sqs.receive_message(
            QueueUrl=self.config.sqs_queue_url,
            MaxNumberOfMessages=self.config.sqs_max_messages,
            WaitTimeSeconds=self.config.sqs_wait_time_seconds,
        )

        messages = response.get("Messages", [])
        if not messages:
            logger.debug("No messages received; sleeping briefly")
            return

        for message in messages:
            receipt_handle = message["ReceiptHandle"]
            try:
                self._handle_message(message)
            except Exception as exc:  # pylint: disable=broad-except
                logger.exception("Error handling message; leaving on queue: %s", exc)
                continue

            try:
                self.sqs.delete_message(
                    QueueUrl=self.config.sqs_queue_url,
                    ReceiptHandle=receipt_handle,
                )
                logger.debug("Deleted message from queue")
            except (BotoCoreError, ClientError) as exc:
                logger.exception("Failed to delete message from SQS: %s", exc)

    def _handle_message(self, message: Dict[str, Any]) -> None:
        body_str = message.get("Body")
        if not body_str:
            logger.warning("Received SQS message without body: %s", message)
            return

        try:
            body = json.loads(body_str)
        except json.JSONDecodeError:
            logger.error("Invalid JSON body: %s", body_str)
            return

        alert_payload = self._extract_alert_payload(body)
        if not isinstance(alert_payload, dict):
            logger.error("Alert payload is not a dict: %s", alert_payload)
            return

        logger.debug("Processing alert payload: %s", alert_payload)
        result = self.process_alert_payload(alert_payload)
        if result is None:
            raise RuntimeError("Ticket creation failed")

    def _extract_alert_payload(self, body: Dict[str, Any]) -> Dict[str, Any]:
        # Support SNS-enveloped SQS messages or direct alerts.
        if "Message" in body and isinstance(body["Message"], str):
            try:
                return json.loads(body["Message"])
            except json.JSONDecodeError:
                logger.debug("Message body not JSON; returning raw string")
                return {"raw_message": body["Message"]}

        # Directly delivered payload
        if "alert" in body and isinstance(body["alert"], dict):
            return body["alert"]

        return body

    # ------------------------------------------------------------------
    # Ticket creation helpers
    # ------------------------------------------------------------------

    def _build_ticket_payload(self, alert_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        structured = self._summarize_alert(alert_payload)
        if structured is None:
            return None

        # Ensure minimal defaults
        structured.setdefault("priority", "medium")
        structured.setdefault("description", structured.get("title", ""))
        structured.setdefault("steps", [])

        return {
            "title": structured.get("title", "Alert"),
            "description": structured.get("description", ""),
            "priority": structured.get("priority", "medium"),
            "metadata": {
                "original_alert": alert_payload,
                "recommended_steps": structured.get("steps", []),
            },
        }

    def _summarize_alert(self, alert_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self._openai_client:
            logger.info("Using fallback summarization (no OpenAI client).")
            return self._fallback_summarization(alert_payload)

        prompt = self._format_prompt(alert_payload)
        try:
            raw = self._call_llm(prompt)
            return self._parse_llm_output(raw, alert_payload)
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("LLM summarization failed: %s", exc)
            return self._fallback_summarization(alert_payload)

    def _format_prompt(self, alert_payload: Dict[str, Any]) -> str:
        alert_json = json.dumps(alert_payload, ensure_ascii=False, indent=2)
        return (
            "You are an SRE assistant. Convert the incoming alert into a ticket recommendation.\n"
            "Output only valid JSON with keys: title, priority (low|medium|high|critical), "
            "description, steps (array of short imperative steps).\n"
            "Summarize this alert JSON:\n"
            f"{alert_json}\n"
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _call_llm(self, prompt: str) -> str:
        if OpenAI is not None and isinstance(self._openai_client, OpenAI):
            response = self._openai_client.responses.create(  # type: ignore[attr-defined]
                model=self.config.openai_model,
                input=prompt,
                temperature=0.2,
            )
            return response.output_text

        # Classic SDK fallback
        response = self._openai_client.ChatCompletion.create(  # type: ignore[attr-defined]
            model=self.config.openai_model,
            messages=[
                {"role": "system", "content": "You are a helpful SRE assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return response["choices"][0]["message"]["content"]

    def _parse_llm_output(self, raw: str, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.strip("`\n ")
            if raw.lower().startswith("json"):
                raw = raw[4:].lstrip()

        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                raise ValueError("LLM output JSON was not an object")
            return parsed
        except json.JSONDecodeError as exc:
            logger.warning("Failed to parse LLM JSON; returning fallback. Error: %s", exc)
            fallback = self._fallback_summarization(alert_payload)
            fallback["description"] = raw
            return fallback

    def _fallback_summarization(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        summary = alert_payload.get("summary") or alert_payload.get("message")
        source = alert_payload.get("source") or alert_payload.get("host", "system")
        priority = "high" if alert_payload.get("severity", 3) >= 8 else "medium"
        return {
            "title": summary or f"Alert from {source}",
            "priority": priority,
            "description": json.dumps(alert_payload, ensure_ascii=False, indent=2),
            "steps": ["Review alert details", "Investigate underlying cause"],
        }

    def _fetch_backend_token(self) -> Optional[str]:
        if self._backend_token_cache:
            return self._backend_token_cache

        # Secrets Manager lookup
        if self.secrets_manager and self.config.secrets_manager_secret_id:
            try:
                response = self.secrets_manager.get_secret_value(
                    SecretId=self.config.secrets_manager_secret_id
                )
                secret_string = response.get("SecretString")
                if secret_string:
                    try:
                        maybe_json = json.loads(secret_string)
                        token = maybe_json.get("BACKEND_TOKEN") if isinstance(maybe_json, dict) else secret_string
                    except json.JSONDecodeError:
                        token = secret_string
                    if token:
                        self._backend_token_cache = token
                        return token
            except (BotoCoreError, ClientError) as exc:
                logger.error("Failed to fetch secret %s: %s", self.config.secrets_manager_secret_id, exc)

        fallback = os.environ.get(self.config.backend_token_env_fallback)
        if fallback:
            self._backend_token_cache = fallback
            return fallback

        return None

    def _post_ticket(self, ticket_payload: Dict[str, Any], backend_token: str) -> Optional[Dict[str, Any]]:
        url = f"{self.config.backend_base_url}{self.config.backend_service_route}"
        try:
            response = requests.post(
                url,
                json=ticket_payload,
                headers={"Authorization": f"Bearer {backend_token}"},
                timeout=10,
            )
            if response.status_code >= 400:
                logger.error("Backend rejected ticket (%s): %s", response.status_code, response.text)
                return None
            return response.json()
        except requests.RequestException as exc:
            logger.exception("Error posting ticket to backend: %s", exc)
            return None

    def _publish_metric(self, metric_name: str, value: float) -> None:
        try:
            self.cloudwatch.put_metric_data(
                Namespace=self.config.cloudwatch_namespace,
                MetricData=[
                    {
                        "MetricName": metric_name,
                        "Value": value,
                        "Unit": "Count",
                    }
                ],
            )
        except (BotoCoreError, ClientError) as exc:
            logger.debug("Failed to publish CloudWatch metric %s: %s", metric_name, exc)


def main():
    config = WorkerConfig.from_env()
    config.validate()
    worker = AlertTriageWorker(config)
    worker.run_forever()


if __name__ == "__main__":
    main()
