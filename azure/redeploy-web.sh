#!/usr/bin/env bash
# Säker omdeploy av testimony-web — ALLTID med NEXT_PUBLIC build-args.
# Använd detta istället för naket "az acr build ." som ger 500 på hela sajten.
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
ACR_NAME="${ACR_NAME:-acrtestimonysc}"
CA_NAME="${CA_NAME:-ca-testimony-prod}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"
REVISION_SUFFIX="${REVISION_SUFFIX:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE saknas"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY måste finnas i $ENV_FILE"
  exit 1
fi

echo "=== ACR build (med NEXT_PUBLIC build-args) ==="
SUPABASE_API_ORIGIN="${SUPABASE_API_ORIGIN:-https://ca-testimony-api.livelyflower-b897116b.swedencentral.azurecontainerapps.io}"
PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://www.testimony.se}"

az acr build \
  --registry "$ACR_NAME" \
  --image testimony-web:latest \
  --build-arg "SUPABASE_API_ORIGIN=${SUPABASE_API_ORIGIN}" \
  --build-arg "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://www.testimony.se}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" \
  --build-arg "NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}" \
  "$ROOT" \
  -o none

ACR_LOGIN=$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)
IMAGE="$ACR_LOGIN/testimony-web:latest"

UPDATE_ARGS=(--image "$IMAGE")
if [[ -n "$REVISION_SUFFIX" ]]; then
  UPDATE_ARGS+=(--revision-suffix "$REVISION_SUFFIX")
fi

echo "=== Uppdaterar $CA_NAME ==="
az containerapp update -g "$RG" -n "$CA_NAME" "${UPDATE_ARGS[@]}" -o none

# AI-miljö (Azure OpenAI eller OpenRouter-fallback)
if [[ -n "${AZURE_OPENAI_API_KEY:-}" && -n "${AZURE_OPENAI_ENDPOINT:-}" ]]; then
  echo "=== Sätter Azure OpenAI secrets/env ==="
  az containerapp secret set -g "$RG" -n "$CA_NAME" \
    --secrets "azure-openai-api-key=${AZURE_OPENAI_API_KEY}" -o none
  az containerapp update -g "$RG" -n "$CA_NAME" \
    --set-env-vars \
      "AI_PROVIDER=${AI_PROVIDER:-azure}" \
      "AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}" \
      "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION:-2024-08-01-preview}" \
      "AZURE_OPENAI_CHAT_DEPLOYMENT=${AZURE_OPENAI_CHAT_DEPLOYMENT:-gpt-4-1-mini}" \
      "AZURE_OPENAI_EMBED_DEPLOYMENT=${AZURE_OPENAI_EMBED_DEPLOYMENT:-text-embedding-3-small}" \
      "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" \
      "DAILY_BIBLE_AI_REVIEW=${DAILY_BIBLE_AI_REVIEW:-true}" \
    -o none
fi

if [[ -n "${API_BIBLE_KEY:-}" ]]; then
  echo "=== Sätter API.Bible secret/env ==="
  az containerapp secret set -g "$RG" -n "$CA_NAME" \
    --secrets "api-bible-key=${API_BIBLE_KEY}" -o none
  az containerapp update -g "$RG" -n "$CA_NAME" \
    --set-env-vars \
      "API_BIBLE_KEY=secretref:api-bible-key" \
      "API_BIBLE_ID=${API_BIBLE_ID:-a556c5305ee15c3f-01}" \
    -o none
fi

echo ""
echo "✅ Web redeploy klar: $IMAGE"
echo ""
echo "Verifiera:"
echo "  curl -sS -o /dev/null -w '%{http_code}' https://www.testimony.se/"
echo "  curl -sS -o /dev/null -w '%{http_code}' https://www.testimony.se/login"
echo ""
echo "Se docs/DEPLOY.md om något strular."
