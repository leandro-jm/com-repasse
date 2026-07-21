# Infra — deploy (registry privado + Portainer)

Deploy do CRM numa VPS via **Portainer**, com imagens publicadas no **registry
privado** `31.220.95.65:5000` (HTTP/inseguro).

```
web (nginx :80) ──/api/*──▶ api :8787   (Hono)
      └── SPA estática        worker      (campanhas WhatsApp)
```

O `web` serve a SPA **e** faz proxy de `/api` → `api` (mesma origem → sem CORS). A
`api` **não** expõe porta pública. O Evolution API é **externo**: a conexão é por
tenant (`whatsapp_instances`), configurada no admin — nunca aqui.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `docker-compose.yml` | Stack de **produção** (Portainer) — usa imagens do registry (pull). |
| `docker-compose.build.yml` | **Build/tag** das imagens (não é deploy). |
| `build-push.sh` | Build + push das 3 imagens `:latest` para o registry. |
| `deploy.env.example` | Modelo de variáveis do stack → copie para `.env`. |

## Pré-requisito: confiar no registry HTTP

O registry é HTTP puro (sem TLS), então **todo Docker que faz pull/push precisa
confiar nele**. Na **VPS** (host do Portainer), em `/etc/docker/daemon.json`:

```json
{ "insecure-registries": ["31.220.95.65:5000"] }
```

Depois `systemctl restart docker`. *(Provavelmente já feito — o registry já serve
`rentflow-*`.)* No lado do **build**, o `build-push.sh` já cria um builder buildx
que confia no registry — não precisa mexer no Docker Desktop.

## 1. Publicar as imagens

```bash
cd infra
./build-push.sh                     # build linux/amd64 + push :latest
```

Gera e envia `31.220.95.65:5000/crm-web`, `crm-api`, `crm-worker` (tag `latest`).
O bundle do web é agnóstico de domínio (`VITE_API_URL=/api`), então **a mesma
imagem serve qualquer domínio**. Sem `docker login` (o registry não pede auth).

> Cross-build: o script mira `linux/amd64` (padrão de VPS) via buildx. No Mac (ARM)
> o Docker Desktop já resolve via QEMU. Se a VPS for ARM: `PLATFORM=linux/arm64 ./build-push.sh`.
> Outro registry: `REGISTRY=host:porta ./build-push.sh`.

## 2. Deploy no Portainer

**Stacks → Add stack → Web editor.** Cole o conteúdo de `docker-compose.yml` e,
em **Environment variables**, preencha (baseado em `deploy.env.example`):

| Variável | Exemplo / nota |
|---|---|
| `REGISTRY` | `31.220.95.65:5000` (host:porta do registry) |
| `IMAGE_TAG` | `latest` |
| `WEB_PORT` | `8080` — porta pública do nginx (atrás de proxy TLS, deixe interna) |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (só backend/worker) |
| `WEB_ORIGIN` | `https://crm.seudominio.com.br` (URL pública) |
| `PUBLIC_APP_URL` | igual ao `WEB_ORIGIN` (links de campanha/opt-out) |
| `APP_ENCRYPTION_KEY` | **obrigatória** — cifra a `api_key` do WhatsApp em repouso |
| `BILLING_PROVIDER` | `manual` |
| `BILLING_WEBHOOK_SECRET` | segredo do webhook |
| `CAMPAIGN_THROTTLE_MIN_MS` / `MAX_MS` | `4000` / `12000` |

**Deploy the stack.** O Portainer faz pull das imagens e sobe os 3 serviços.
Publique o web (porta `WEB_PORT`) atrás de um proxy TLS (Traefik/Caddy/Nginx
Proxy Manager) apontando o domínio de `WEB_ORIGIN`.

Alternativa por CLI, na VPS:

```bash
cd infra
cp deploy.env.example .env && nano .env   # preencha os segredos
docker compose pull && docker compose up -d
```

## 3. Atualizar (novo deploy)

```bash
./build-push.sh                           # novo :latest no registry
```

No Portainer: **Stacks → (stack) → Pull and redeploy** (marque *re-pull image*).
Via CLI: `docker compose pull && docker compose up -d`.

## Banco de dados

As migrations/seed **não** estão nas imagens — aplique com o Supabase CLI apontando
para o projeto Cloud (`supabase link` + `supabase db push`), como no README raiz.

## Notas

- **`APP_ENCRYPTION_KEY` é obrigatória**: com `NODE_ENV=production` a API falha no
  boot sem ela (evita cifrar segredos com chave pública). Use valor forte e único.
- **Sem CORS em produção**: front e API compartilham a origem via proxy do nginx.
  `WEB_ORIGIN` segue configurado como rede de segurança.
- **API não é pública**: só o `web` publica porta. Para expor a API diretamente
  (ex.: webhook de billing externo), adicione um `ports:` ao serviço `api`.
