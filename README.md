# The Ninjas – Agentic IT Co‑Pilot (MVP)

Monorepo for an agentic, human‑in‑the‑loop IT co‑pilot for MSPs. It automates patch management, triages alerts, assists on tickets, and surfaces business insights. Built for local-first dev with a mock LLM and simple RBAC.

## Repository layout

apps/
web/ (Next.js 14 App Router)
api/ (Express + Prisma + BullMQ + Socket.IO)
packages/
ui/ (shared Button/Card – shadcn-like minimal)
types/ (zod schemas & TS types)
llm/ (OpenAI adapter + MockLLM; CoreNin orchestration)
utils/ (config validation, logger)
infra/
docker/ (docker-compose, Dockerfile)

## Stack

-   Monorepo: TurboRepo + pnpm
-   Web: Next.js 14 (App Router, RSC), Tailwind, NextAuth
-   API: Node.js + Express (TypeScript), Prisma (PostgreSQL), BullMQ (Redis), Socket.IO
-   LLM: Provider‑agnostic adapter. Default is MockLLM for offline/demo
-   Observability: pino logs, request IDs, /metrics (Prometheus)
-   Tests: Vitest + Supertest (API), Playwright (web E2E)
-   DevOps: Docker + docker‑compose, GitHub Actions CI

## Quickstart (local dev)

1. Install pnpm and dependencies

```bash
corepack enable && corepack prepare pnpm@latest --activate
pnpm i
```

2. Database & seed

```bash
pnpm db:push
pnpm db:seed
```

3. Start dev servers

```bash
pnpm dev
```

Web at http://localhost:3000, API at http://localhost:4000, Swagger UI at http://localhost:4000/docs.

## Docker (optional)

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

Brings up Postgres, Redis, API, and Web (default dev mode).

## Environment

Use per-app `.env`:

-   apps/api/.env
    -   DATABASE_URL=postgres://postgres:postgres@localhost:5432/ninja
    -   REDIS_URL=redis://localhost:6379
    -   PORT=4000
    -   LLM_PROVIDER=mock | openai
    -   OPENAI_API_KEY=...
    -   FEATURE_PATCH_AUTO=false
-   apps/web/.env
    -   NEXTAUTH_URL=http://localhost:3000
    -   NEXTAUTH_SECRET=changeme
    -   GOOGLE_CLIENT_ID= (optional)
    -   GOOGLE_CLIENT_SECRET= (optional)
    -   API_BASE_URL=http://localhost:4000

## Auth & RBAC

-   Web: NextAuth (dev credentials). Use any email to sign in; role defaults to viewer. Quick buttons: Tech/Admin.
-   API: Bearer token RBAC via middleware (dev only):
    -   Admin → Authorization: `Bearer dev-admin`
    -   Technician → Authorization: `Bearer dev-tech`
    -   Viewer → omit or any other
-   The web’s server-side `apiFetch` automatically injects a role-derived bearer token from the session for RBAC.

## Agents & queues

-   CoreNin: Orchestrator that routes tasks to agents
-   AlertNin: Alert triage (fingerprint grouping) → `alert-triage` queue
-   PatchNin: Patch planning and execution → `patch-exec` queue
-   TechNin: Ticket assist (MockLLM/OpenAI)
-   BizNin: Insights recompute → `insights` queue

## Realtime events (Socket.IO)

-   `alert_clustered`: Emitted when clustering task completes
-   `patch_run_update`: Emitted with patch run progress/fail/rollback messages
-   `ticket_suggestion_ready`: Emitted with TechNin suggestion (MVP uses direct response)

## API overview (v1)

-   Alerts
    -   POST /v1/alerts/ingest (bulk upsert; zod-validated)
    -   GET /v1/alerts
    -   POST /v1/alerts/:id/ack
    -   POST /v1/alerts/cluster → enqueues triage job
-   Tickets
    -   GET /v1/tickets
    -   POST /v1/tickets/:id/suggest → TechNin suggestion
    -   POST /v1/tickets/:id/apply → persist suggestion + ActionLog
-   Patches
    -   GET /v1/patches
    -   POST /v1/patch-plans → PatchNin plan (dry‑run)
    -   POST /v1/patch-runs → executes plan (enqueues)
    -   POST /v1/patch-runs/:id/rollback
-   Insights
    -   GET /v1/insights/summary
    -   POST /v1/insights/recompute → enqueues recompute
-   Agents (CoreNin)
    -   POST /v1/agents/triage-alerts
    -   POST /v1/agents/daily-maintenance
-   Feature flags
    -   GET /v1/flags
-   Health/meta
    -   GET /healthz
    -   GET /metrics
    -   GET /openapi.json and /docs

## Domain model (Prisma)

Models: User, Account, Session, VerificationToken; Organization, Client, TechnicianProfile; Alert, AlertCluster, Ticket, Patch, PatchPlan, PatchRun, ActionLog, InsightSnapshot, FeatureFlag, ApiKey.
Key enums: AlertSeverity (LOW|MED|HIGH|CRITICAL), AlertStatus (NEW|NOISE|ACK|RESOLVED), ApprovalStatus (PENDING|APPROVED|REJECTED), PatchRunStatus (PENDING|RUNNING|SUCCESS|FAILED|ROLLED_BACK).

## Seed data

-   Org “Ninja MSP”, three clients, five technicians
-   ~120 alerts (mixed severities & duplicates)
-   30 tickets with terse stack traces
-   ~40 patches with fake CVEs/KBs
-   One sample patch plan/run
-   Insight snapshots with non-zero KPI metrics

## LLM adapters

-   `@ninjas/llm` exports:
    -   `MockLLM` for offline/demo
    -   `OpenAIAdapter` (stubbed tool responses for MVP)
    -   `CoreNin.runTask(type, payload)` routes to agents
-   Tools:
    -   `search_alerts(query)`
    -   `propose_patch_plan(clientId, products[])`
    -   `suggest_ticket_reply(ticketId)`

## UI & UX

-   Minimal Tailwind styling; `@ninjas/ui` provides Button/Card
-   Pages:
    -   /login (NextAuth dev creds)
    -   /dashboard (KPIs from insights)
    -   /alerts (list, Run triage)
    -   /tickets (suggest action)
    -   /patches (create plan, run, live logs)
    -   /insights (JSON snapshot)
    -   /settings (feature flags)

## Security & safety

-   All agent actions create ActionLog entries (actor=AGENT)
-   Patch plans default to dry‑run; require approval unless feature flag `patch.auto` is enabled
-   Write routes are rate-limited and zod-validated

## Scripts

Root scripts (package.json):

-   `pnpm dev`: run web + api concurrently via Turbo
-   `pnpm build`: build all
-   `pnpm db:push | db:migrate | db:reset | db:seed`: Prisma workflows (API)
-   `pnpm openapi`: generate OpenAPI spec (API)
-   `pnpm test`: run tests via Turbo

## Testing

-   Unit/API: Vitest + Supertest (API smoke tests included)
-   E2E: Playwright (web) – basic “home renders” spec included

## CI (GitHub Actions)

-   Spins up Postgres & Redis services
-   Installs deps, pushes schema, seeds, builds, and runs tests
-   Uploads test results via standard actions logs

## Demo paths

1. From chaos to clarity
    - Ingest alerts (seeded)
    - Run triage → clusters appear on /alerts (clusterId set)
    - Ack noise → surface criticals
2. Safe patching
    - Create plan (dry-run) → approve (if `patch.auto=false`) → run
    - Simulated failure on step 3 → emit rollback log → live logs visible on /patches

## Notes for developers

-   RBAC: For manual API calls, add `Authorization` header:
    -   Bearer dev-admin | dev-tech | (none → viewer)
-   Swagger: Refresh spec by running `pnpm openapi` in `apps/api`, then visit `/docs`.
-   Extending agents: Implement new tools in `@ninjas/llm`, add zod schema in `@ninjas/types`, and route via `CoreNin`.
-   Prod hardening (future): swap dev tokens for real JWT verification; add more precise RBAC per org; expand clustering to embeddings; implement real patch execution drivers.

## License

MIT
