# Backend API (Hono) — build a partir da raiz do monorepo:
#   docker build -f apps/api/Dockerfile -t crm-api .
FROM node:22-alpine
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --filter api... --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
EXPOSE 8787
CMD ["pnpm", "start"]
