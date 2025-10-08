# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

FROM base AS api
RUN pnpm i --frozen-lockfile || pnpm i
WORKDIR /repo/apps/api
RUN pnpm build || true
EXPOSE 4000
CMD ["pnpm", "dev"]

FROM base AS web
WORKDIR /repo/apps/web
RUN pnpm i --frozen-lockfile || pnpm i
EXPOSE 3000
CMD ["pnpm", "dev"]

