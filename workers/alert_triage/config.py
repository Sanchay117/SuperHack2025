from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class WorkerConfig:
    """Configuration values for the alert triage worker."""

    sqs_queue_url: str
    aws_region: str = "us-east-1"
    sqs_endpoint_url: Optional[str] = None
    secrets_manager_secret_id: Optional[str] = None
    backend_base_url: str = "http://localhost:4000"
    backend_service_route: str = "/api/service/tickets"
    backend_token_env_fallback: str = "BACKEND_TOKEN"
    openai_model: str = "gpt-4o-mini"
    cloudwatch_namespace: str = "AlertTriage"
    cloudwatch_endpoint_url: Optional[str] = None
    sqs_wait_time_seconds: int = 20
    sqs_max_messages: int = 5

    @classmethod
    def from_env(cls) -> "WorkerConfig":
        """Create a configuration object from environment variables."""
        return cls(
            sqs_queue_url=os.environ.get("ALERT_TRIAGE_QUEUE_URL", ""),
            aws_region=os.environ.get("AWS_REGION", "us-east-1"),
            sqs_endpoint_url=os.environ.get("AWS_ENDPOINT_URL"),
            secrets_manager_secret_id=os.environ.get("BACKEND_TOKEN_SECRET_ID"),
            backend_base_url=os.environ.get(
                "BACKEND_BASE_URL", "http://localhost:4000"
            ),
            backend_service_route=os.environ.get(
                "BACKEND_SERVICE_ROUTE", "/api/service/tickets"
            ),
            backend_token_env_fallback=os.environ.get(
                "BACKEND_TOKEN_ENV_KEY", "BACKEND_TOKEN"
            ),
            openai_model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            cloudwatch_namespace=os.environ.get(
                "CLOUDWATCH_NAMESPACE", "AlertTriage"
            ),
            cloudwatch_endpoint_url=os.environ.get("AWS_CLOUDWATCH_ENDPOINT"),
            sqs_wait_time_seconds=int(os.environ.get("SQS_WAIT_TIME", "20")),
            sqs_max_messages=int(os.environ.get("SQS_MAX_MESSAGES", "5")),
        )

    def validate(self) -> None:
        if not self.sqs_queue_url:
            raise ValueError(
                "ALERT_TRIAGE_QUEUE_URL is required to run the worker."
            )
