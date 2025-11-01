# Alert Triage Worker

Person C (Agents / ML Engineer) deliverable for the SuperHack project.

This worker runs outside of the Next.js/Express stack and is responsible for turning raw alert events into actionable backend tickets using an LLM.

## Runtime choice

For the demo we target a **containerised Python worker**. It can run locally (e.g. `python workers/alert_triage/worker.py`) or be packaged into a Docker image for ECS Fargate. The same code can be converted into an AWS Lambda handler because the logic lives in the `AlertTriageWorker` class.

## Responsibilities

1. **Poll SQS** – Long-poll the `alert-triage-queue` (or any configured queue). For local development you can use [LocalStack](https://docs.localstack.cloud/).
2. **Fetch shared secret** – Retrieve `BACKEND_TOKEN` from AWS Secrets Manager (or fall back to the local environment variable) so that only trusted services can invoke the backend.
3. **Call the LLM** – Create a deterministic prompt that forces JSON replies:
   ```text
   Output only valid JSON with keys: title, priority (low|medium|high|critical), description, steps [array of short steps].
   Summarize: <ALERT_JSON>
   ```
4. **POST to backend** – Hit `POST /api/service/tickets` (protected by `serviceAuth` middleware) with the structured payload.
5. **Retries & DLQ** – SQS retry semantics are used by default. Configure the queue with the `alert-triage-dlq` redrive policy in AWS/LocalStack. The worker leaves the message on the queue upon failure so SQS can retry and eventually dead-letter.
6. **Logging & metrics** – Metrics are emitted to CloudWatch (`TicketsCreated`, `SummarizationFailures`). Logs are standard Python logging (INFO for success, ERROR on failure).

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `ALERT_TRIAGE_QUEUE_URL` | Required. URL of the SQS queue to read from. | _None_ |
| `AWS_REGION` | AWS region or LocalStack region. | `us-east-1` |
| `AWS_ENDPOINT_URL` | Optional endpoint override (e.g. `http://localhost:4566` for LocalStack). | _None_ |
| `AWS_CLOUDWATCH_ENDPOINT` | Optional CloudWatch endpoint override (useful for LocalStack). | _None_ |
| `BACKEND_TOKEN_SECRET_ID` | Secrets Manager secret containing `BACKEND_TOKEN`. | _None_ |
| `BACKEND_TOKEN_ENV_KEY` | Env var fallback for the backend token. | `BACKEND_TOKEN` |
| `BACKEND_BASE_URL` | Base URL of Express backend. | `http://localhost:4000` |
| `BACKEND_SERVICE_ROUTE` | Service route path. | `/api/service/tickets` |
| `OPENAI_API_KEY` | API key for OpenAI. If absent, the worker falls back to a heuristic summariser. | _None_ |
| `OPENAI_MODEL` | LLM model name. | `gpt-4o-mini` |
| `CLOUDWATCH_NAMESPACE` | Namespace for metrics. | `AlertTriage` |
| `SQS_WAIT_TIME` | Long-poll wait time (seconds). | `20` |
| `SQS_MAX_MESSAGES` | Max messages per poll. | `5` |

## Running locally

1. **Install dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Start backend** (make sure `BACKEND_TOKEN` in backend env matches your worker). For testing you can export:
   ```bash
   export BACKEND_TOKEN=demo-token
   ```

3. **Start LocalStack (optional)**
   ```bash
   SERVICES=sqs,secretsmanager,cloudwatch localstack start -d
   aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name alert-triage-queue
   aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name alert-triage-dlq
   aws --endpoint-url=http://localhost:4566 secretsmanager create-secret --name triage/backend --secret-string '{"BACKEND_TOKEN":"demo-token"}'
   export ALERT_TRIAGE_QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-url --queue-name alert-triage-queue --query QueueUrl --output text)
   export BACKEND_TOKEN_SECRET_ID=triage/backend
   export AWS_ENDPOINT_URL=http://localhost:4566
   export AWS_CLOUDWATCH_ENDPOINT=http://localhost:4566
   ```

4. **Run the worker**
   ```bash
   python workers/alert_triage/worker.py
   ```

5. **Use the harness**
   ```bash
   # Queue the sample alert
   python workers/alert_triage/test_harness.py --send-sample

   # Process a single message (long-poll once)
   python workers/alert_triage/test_harness.py --poll-once

   # Run the pipeline without SQS (direct call)
   python workers/alert_triage/test_harness.py --process-sample
   ```

## Metrics & retries

* **Retries** – If `_handle_message` raises an exception the message is left in the queue. Configure the queue with `RedrivePolicy` so that after *N* receive attempts the message goes to `alert-triage-dlq`.
* **Metrics** – `TicketsCreated` is sent on success, `SummarizationFailures` on any failure path. These metrics are emitted via `cloudwatch.put_metric_data` and work with AWS or LocalStack.

## Extending for production

* Package the worker with a `Dockerfile` and deploy as an ECS Fargate service for long-running reliability.
* Swap OpenAI for Amazon Bedrock or SageMaker by replacing `_call_llm`.
* Add structured logging (JSON) and push to CloudWatch Logs / Datadog.
* Enable message attribute checks (e.g. trace IDs) and attach them to tickets.
