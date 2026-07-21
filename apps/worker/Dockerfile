# Worker de campanhas — build a partir da raiz do monorepo:
#   docker build -f apps/worker/Dockerfile -t crm-worker .
FROM node:22-alpine
RUN corepack enable
WORKDIR /app

# manifests para cache de deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --filter worker... --frozen-lockfile

# código
COPY packages/shared packages/shared
COPY apps/worker apps/worker

WORKDIR /app/apps/worker
CMD ["pnpm", "start"]
