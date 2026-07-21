#!/usr/bin/env bash
# =============================================================================
# Build das imagens (web/api/worker) e push para o REGISTRY PRIVADO.
#
#   ./build-push.sh                 # build (linux/amd64) + push :latest
#   ./build-push.sh --no-push       # só build, carrega no daemon local
#
# Variáveis:
#   REGISTRY   host:porta do registry (default: 31.220.95.65:5000)
#   IMAGE_TAG  tag das imagens        (default: latest)
#   PLATFORM   arquitetura de destino (default: linux/amd64 — a VPS)
#   VITE_API_URL       base da API no bundle web (default: /api, relativo)
#   REGISTRY_INSECURE  1 = registry HTTP/inseguro (default: 1)
#
# Registry HTTP inseguro: este script cria um builder buildx (docker-container)
# configurado para confiar no host. A VPS que faz PULL também precisa confiar:
#   /etc/docker/daemon.json → {"insecure-registries":["31.220.95.65:5000"]}
#   e reiniciar o Docker. (Provável já feito — o registry já serve rentflow-*.)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

REGISTRY="${REGISTRY:-31.220.95.65:5000}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
VITE_API_URL="${VITE_API_URL:-/api}"
REGISTRY_INSECURE="${REGISTRY_INSECURE:-1}"
COMPOSE_FILE="docker-compose.build.yml"

REGISTRY_HOST="${REGISTRY%%/*}"                                # host:porta (sem path)
BUILDER="crm-$(printf '%s' "$REGISTRY_HOST" | tr -c 'a-zA-Z0-9' '-')"

PUSH=1
[[ "${1:-}" == "--no-push" ]] && PUSH=0

export REGISTRY IMAGE_TAG VITE_API_URL

echo "▸ Registry : $REGISTRY   (inseguro/HTTP: $([[ "$REGISTRY_INSECURE" == "1" ]] && echo sim || echo não))"
echo "▸ Tag      : $IMAGE_TAG"
echo "▸ Platform : $PLATFORM"
echo "▸ Push     : $([[ $PUSH -eq 1 ]] && echo sim || echo não)"
echo

BUILDER_ARG=()
if [[ "$REGISTRY_INSECURE" == "1" ]]; then
  # Builder buildx que confia no registry HTTP inseguro (idempotente por host).
  if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
    echo "▸ Criando builder '$BUILDER' (confia em $REGISTRY_HOST via HTTP)…"
    CFG="$(mktemp)"
    cat > "$CFG" <<EOF
[registry."$REGISTRY_HOST"]
  http = true
  insecure = true
EOF
    docker buildx create --name "$BUILDER" --driver docker-container \
      --config "$CFG" --bootstrap >/dev/null
    rm -f "$CFG"
  fi
  BUILDER_ARG=(--builder "$BUILDER")
fi

OUTPUT=$([[ $PUSH -eq 1 ]] && echo "--push" || echo "--load")

# --allow=fs.read=..: o contexto de build é a raiz do monorepo (..), fora de infra/;
# o buildx bake exige liberar leitura desse caminho explicitamente.
docker buildx bake "${BUILDER_ARG[@]}" -f "$COMPOSE_FILE" \
  --allow=fs.read=.. \
  --set "*.platform=$PLATFORM" "$OUTPUT"

echo
echo "✓ $([[ $PUSH -eq 1 ]] && echo 'Push concluído' || echo 'Build concluído (sem push)'):"
for svc in web api worker; do
  echo "    $REGISTRY/crm-$svc:$IMAGE_TAG"
done
