The Ninjas – Agentic IT Co‑Pilot (MVP)
=================================================

Monorepo for an agentic, human‑in‑the‑loop IT co‑pilot for MSPs.

Stack
--------------------------------
- Monorepo: TurboRepo + pnpm
- Web: Next.js 14, TypeScript, Tailwind, shadcn/ui, NextAuth
- API: Node.js + Express (TypeScript), Prisma (PostgreSQL), BullMQ (Redis), Socket.IO
- LLM: Provider‑agnostic adapters (OpenAI compatible + MockLLM)
- Observability: pino logs, request IDs, /metrics (Prometheus)
- Tests: Vitest + Supertest (API), Playwright (web E2E)
- DevOps: Docker + docker‑compose, GitHub Actions CI

Apps & Packages
--------------------------------
- apps/web: Next.js web app
- apps/api: Express API and workers
- packages/ui: shared UI components
- packages/types: zod schemas + TS types
- packages/llm: LLM adapters and tool interfaces
- packages/utils: logging, config, feature flags
- infra: docker, scripts, dashboards

Getting Started (Dev)
--------------------------------
1) Install pnpm and Turbo
```bash
corepack enable && corepack prepare pnpm@latest --activate
pnpm i
```

2) Environment
Create a `.env` in `apps/api` and `apps/web` using values from the README’s env section (a full `.env.example` will be placed in each app directory during scaffold).

3) Start dev
```bash
pnpm dev
```
Web on `http://localhost:3000`, API on `http://localhost:4000`.

Database & Seeds
--------------------------------
```bash
pnpm db:push
pnpm db:seed
```

Docker
--------------------------------
Once infra is added, run:
```bash
docker compose up --build
```

LLM Providers
--------------------------------
Set `LLM_PROVIDER=mock` for offline/demo, or `openai` with `OPENAI_API_KEY`.

Agents
--------------------------------
- CoreNin (orchestrator)
- PatchNin (patch mgmt)
- AlertNin (alert triage)
- TechNin (tech assistant)
- BizNin (insights)

License
--------------------------------
MIT
