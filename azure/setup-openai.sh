#!/usr/bin/env bash
# Skapar Azure OpenAI-resurs + deployments för testimony.se
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
LOC="${LOC:-swedencentral}"
OAI_NAME="${OAI_NAME:-oai-testimony-sc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

if ! az account show &>/dev/null; then
  echo "❌ az login krävs"
  exit 1
fi

echo "=== Azure OpenAI: $OAI_NAME ==="

if ! az cognitiveservices account show -g "$RG" -n "$OAI_NAME" &>/dev/null; then
  echo "Skapar Cognitive Services-konto (OpenAI)..."
  az cognitiveservices account create \
    -g "$RG" \
    -n "$OAI_NAME" \
    -l "$LOC" \
    --kind OpenAI \
    --sku S0 \
    --custom-domain "$OAI_NAME" \
    --yes \
    -o none
else
  echo "Konto finns redan."
fi

ENDPOINT=$(az cognitiveservices account show -g "$RG" -n "$OAI_NAME" --query properties.endpoint -o tsv)
API_KEY=$(az cognitiveservices account keys list -g "$RG" -n "$OAI_NAME" --query key1 -o tsv)

deploy_if_missing() {
  local name="$1" model="$2" version="$3" capacity="${4:-30}" sku="${5:-Standard}"
  if az cognitiveservices account deployment show -g "$RG" -n "$OAI_NAME" --deployment-name "$name" &>/dev/null; then
    echo "   Deployment $name finns redan."
    return 0
  fi
  echo "   Deployar $name ($model)..."
  az cognitiveservices account deployment create \
    -g "$RG" \
    -n "$OAI_NAME" \
    --deployment-name "$name" \
    --model-name "$model" \
    --model-version "$version" \
    --model-format OpenAI \
    --sku-capacity "$capacity" \
    --sku-name "$sku" \
    -o none
}

# gpt-4o-mini 2024-07-18 deprecated 2026-03 — använd gpt-4.1-mini
deploy_if_missing "gpt-4-1-mini" "gpt-4.1-mini" "2025-04-14" 30 Standard
deploy_if_missing "text-embedding-3-small" "text-embedding-3-small" "1" 30 GlobalStandard

echo ""
echo "✅ Azure OpenAI klar"
echo "   Endpoint: $ENDPOINT"
echo ""
echo "Lägg till i .env.local:"
cat <<EOF

AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=$ENDPOINT
AZURE_OPENAI_API_KEY=<från Key Vault eller az keys list>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4-1-mini
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-small

EOF

if [[ -f "$ENV_FILE" ]]; then
  upsert_env() {
    local key="$1" val="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      echo "${key}=${val}" >> "$ENV_FILE"
    fi
  }
  upsert_env "AI_PROVIDER" "azure"
  upsert_env "AZURE_OPENAI_ENDPOINT" "$ENDPOINT"
  upsert_env "AZURE_OPENAI_API_KEY" "$API_KEY"
  upsert_env "AZURE_OPENAI_API_VERSION" "2024-08-01-preview"
  upsert_env "AZURE_OPENAI_CHAT_DEPLOYMENT" "gpt-4o-mini"
  upsert_env "AZURE_OPENAI_EMBED_DEPLOYMENT" "text-embedding-3-small"
  echo "   Uppdaterade $ENV_FILE (OPENROUTER behålls som fallback)."
fi
