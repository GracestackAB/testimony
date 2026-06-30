#!/usr/bin/env bash
# Sätt Google OAuth client secret på GoTrue (måste vara GOCSPX-... från GCP Console).
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
GOTRUE_APP="${GOTRUE_APP:-ca-testimony-gotrue}"
KV_NAME="${KV_NAME:-kv-testimony-sc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

[[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }

SECRET="${GOTRUE_EXTERNAL_GOOGLE_CLIENT_SECRET:-${GOOGLE_CLIENT_SECRET:-}}"

if [[ -z "$SECRET" ]]; then
  echo "❌ Sätt GOTRUE_EXTERNAL_GOOGLE_CLIENT_SECRET i $ENV_FILE"
  echo "   Hämta från GCP → OAuth client → Client secret (börjar med GOCSPX-)"
  exit 1
fi

if [[ "$SECRET" != GOCSPX-* ]]; then
  echo "⚠️  Secret börjar inte med GOCSPX- — dubbelkolla att det är rätt värde från GCP"
fi

echo "=== Uppdaterar google-secret (len=${#SECRET}) ==="
az containerapp secret set -g "$RG" -n "$GOTRUE_APP" \
  --secrets "google-secret=$SECRET" -o none

az keyvault secret set --vault-name "$KV_NAME" \
  --name google-oauth-client-secret --value "$SECRET" -o none

REV=$(az containerapp revision list -g "$RG" -n "$GOTRUE_APP" \
  --query "[?properties.active].name | [0]" -o tsv)
az containerapp revision restart -g "$RG" -n "$GOTRUE_APP" --revision "$REV" -o none

echo "✅ Google OAuth secret uppdaterad och GoTrue omstartad."
