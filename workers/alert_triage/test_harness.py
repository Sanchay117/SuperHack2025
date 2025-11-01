"""Local test harness for the alert triage worker.

Usage examples
--------------
1. Seed a queue (LocalStack or AWS) with the sample alert:

    python workers/alert_triage/test_harness.py --send-sample

2. Run a single processing pass against the queue (long-polls once):

    python workers/alert_triage/test_harness.py --poll-once

3. Run the summarisation pipeline locally without SQS (requires BACKEND_TOKEN, backend running):

    python workers/alert_triage/test_harness.py --process-sample

Environment variables such as ALERT_TRIAGE_QUEUE_URL, AWS_ENDPOINT_URL, BACKEND_TOKEN, and
BACKEND_BASE_URL are respected via WorkerConfig.from_env().
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict

import boto3

from .config import WorkerConfig
from .worker import AlertTriageWorker

SAMPLE_ALERT_PATH = Path(__file__).parent / "sample_alert.json"

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def load_sample_alert() -> Dict[str, Any]:
    with SAMPLE_ALERT_PATH.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def send_sample_message(config: WorkerConfig) -> None:
    alert = load_sample_alert()
    queue_url = config.sqs_queue_url
    if not queue_url:
        raise ValueError("ALERT_TRIAGE_QUEUE_URL must be set to send a message")

    kwargs = {"region_name": config.aws_region}
    if config.sqs_endpoint_url:
        kwargs["endpoint_url"] = config.sqs_endpoint_url

    sqs = boto3.client("sqs", **kwargs)
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(alert))
    logger.info("Sample alert queued to %s", queue_url)


def poll_once(config: WorkerConfig) -> None:
    worker = AlertTriageWorker(config)
    worker._poll_once()  # pylint: disable=protected-access


def process_sample_direct(config: WorkerConfig) -> None:
    worker = AlertTriageWorker(config)
    alert = load_sample_alert()
    worker.process_alert_payload(alert)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Alert triage worker harness")
    parser.add_argument("--send-sample", action="store_true", help="Put the sample alert onto the queue")
    parser.add_argument("--poll-once", action="store_true", help="Poll the queue once for messages")
    parser.add_argument("--process-sample", action="store_true", help="Process the sample alert directly without SQS")
    parser.add_argument(
        "--queue-url",
        help="Override ALERT_TRIAGE_QUEUE_URL for this run",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = WorkerConfig.from_env()
    if args.queue_url:
        config.sqs_queue_url = args.queue_url
    if args.send_sample:
        send_sample_message(config)
    elif args.poll_once:
        poll_once(config)
    elif args.process_sample:
        process_sample_direct(config)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
