# Frontend (React + Vite) servido por nginx, que também faz proxy de /api → api.
# Build a partir da RAIZ do monorepo:
#   docker build -f apps/web/Dockerfile -t crm-web .
#
# O bundle é AGNÓSTICO de domínio: VITE_API_URL=/api (caminho relativo). Assim a
# mesma imagem serve qualquer domínio — a API fica na mesma origem, sob /api.

# ---- build ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

# API na mesma origem, sob /api (nginx faz o proxy). Relativo => 1 imagem serve
# qualquer domínio. Para apontar a uma API externa: --build-arg VITE_API_URL=https://...
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# manifests primeiro (cache de deps)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --filter web... --frozen-lockfile

# tsconfig base do monorepo (apps/web/tsconfig.json faz extends "../../tsconfig.base.json";
# sem isto o tsc -b perde esModuleInterop/skipLibCheck/moduleResolution e o build quebra)
COPY tsconfig.base.json ./

# código e build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter web build

# ---- runtime (nginx) ----
FROM nginx:1.27-alpine AS runtime
# O entrypoint oficial do nginx faz envsubst nos *.template. O filtro garante que
# SÓ ${API_UPSTREAM} seja trocado (as variáveis internas do nginx — $uri, $host… — ficam intactas).
ENV API_UPSTREAM=http://api:8787
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY apps/web/nginx.default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
