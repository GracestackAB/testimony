#!/usr/bin/env bash
# Full Azure-deploy: testimony.se Next.js på Container Apps + cron jobs + Key Vault
# Runbook + felsökning: docs/DEPLOY.md
# Snabb web-only: ./azure/redeploy-web.sh
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
LOC="${LOC:-swedencentral}"
ACR_NAME="${ACR_NAME:-acrtestimonysc}"
CA_NAME="${CA_NAME:-ca-testimony-prod}"
CAE_NAME="${CAE_NAME:-cae-testimony}"
KV_NAME="${KV_NAME:-kv-testimony-sc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE saknas"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if ! az account show &>/dev/null; then
  echo "❌ az login krävs"
  exit 1
fi

az extension add --name containerapp --upgrade -y 2>/dev/null || true

echo "=== 0/6 Resursgrupp ==="
az group create --name "$RG" --location "$LOC" -o none

ACR_LOGIN=$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv 2>/dev/null || true)
CA_EXISTS=false
az containerapp show -g "$RG" -n "$CA_NAME" &>/dev/null && CA_EXISTS=true

echo "=== 1/6 ACR build + push (web) ==="
if [[ -z "$ACR_LOGIN" ]]; then
  echo "   ACR saknas — kör minimal bicep först"
  az deployment group create \
    -g "$RG" \
    -n "testimony-acr-$(date +%Y%m%d%H%M)" \
    -f "$ROOT/azure/infra/stack.bicep" \
    -p acrName="$ACR_NAME" \
    -p keyVaultName="$KV_NAME" \
    -p containerAppName="$CA_NAME" \
    -p containerEnvName="$CAE_NAME" \
    -p deployContainerApp=false \
    --only-show-errors -o none
  ACR_LOGIN=$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)
fi
az acr build \
  --registry "$ACR_NAME" \
  --image testimony-web:latest \
  --build-arg "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://testimony.se}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" \
  --build-arg "NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}" \
  "$ROOT" \
  -o none

if [[ "$CA_EXISTS" == "false" ]]; then
  echo "=== 2/6 Bicep — skapa Container App ==="
  az deployment group create \
    -g "$RG" \
    -n "testimony-stack-$(date +%Y%m%d%H%M)" \
    -f "$ROOT/azure/infra/stack.bicep" \
    -p acrName="$ACR_NAME" \
    -p keyVaultName="$KV_NAME" \
    -p containerAppName="$CA_NAME" \
    -p containerEnvName="$CAE_NAME" \
    -p containerImage="$ACR_LOGIN/testimony-web:latest" \
    -p deployContainerApp=true \
    --only-show-errors -o none
else
  echo "=== 2/6 Bicep — hoppar över (CA finns redan) ==="
fi

FQDN=$(az containerapp show -g "$RG" -n "$CA_NAME" --query properties.configuration.ingress.fqdn -o tsv)
echo "   ACR: $ACR_LOGIN"
echo "   FQDN: https://$FQDN"

echo "=== 3/6 Key Vault — lagra secrets ==="
KV_ID=$(az keyvault show -n "$KV_NAME" -g "$RG" --query id -o tsv)
USER_OID=$(az ad signed-in-user show --query id -o tsv)
az role assignment create --role "Key Vault Secrets Officer" --assignee "$USER_OID" --scope "$KV_ID" -o none 2>/dev/null || true

store_secret() {
  local name="$1" val="$2"
  [[ -z "$val" ]] && return 0
  az keyvault secret set --vault-name "$KV_NAME" -n "$name" --value "$val" -o none 2>/dev/null || true
}

store_secret supabase-service-role-key "${SUPABASE_SERVICE_ROLE_KEY:-}"
store_secret stripe-secret-key "${STRIPE_SECRET_KEY:-}"
store_secret stripe-webhook-secret "${STRIPE_WEBHOOK_SECRET:-}"
store_secret cron-secret "${CRON_SECRET:-}"
store_secret vapid-private-key "${VAPID_PRIVATE_KEY:-}"
store_secret resend-api-key "${RESEND_API_KEY:-}"
store_secret database-url "${DATABASE_URL:-}"
store_secret openrouter-api-key "${OPENROUTER_API_KEY:-}"
store_secret azure-openai-api-key "${AZURE_OPENAI_API_KEY:-}"
store_secret api-bible-key "${API_BIBLE_KEY:-}"

echo "=== 4/6 Uppdatera Container App ==="
SECRET_ARGS=()
add_secret() { [[ -n "${2:-}" ]] && SECRET_ARGS+=("$1=$2"); }
add_secret supabase-service-role-key "${SUPABASE_SERVICE_ROLE_KEY:-}"
add_secret stripe-secret-key "${STRIPE_SECRET_KEY:-}"
add_secret stripe-webhook-secret "${STRIPE_WEBHOOK_SECRET:-}"
add_secret cron-secret "${CRON_SECRET:-}"
add_secret vapid-private-key "${VAPID_PRIVATE_KEY:-}"
add_secret resend-api-key "${RESEND_API_KEY:-}"
add_secret database-url "${DATABASE_URL:-}"
add_secret openrouter-api-key "${OPENROUTER_API_KEY:-}"
add_secret azure-openai-api-key "${AZURE_OPENAI_API_KEY:-}"
add_secret api-bible-key "${API_BIBLE_KEY:-}"

if [[ ${#SECRET_ARGS[@]} -gt 0 ]]; then
  az containerapp secret set -g "$RG" -n "$CA_NAME" --secrets "${SECRET_ARGS[@]}" -o none
fi

ENV_VARS=(
  "NODE_ENV=production"
  "PORT=3005"
  "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://testimony.se}"
  "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-}"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}"
  "STRIPE_PRICE_SMALL=${STRIPE_PRICE_SMALL:-}"
  "STRIPE_PRICE_MEDIUM=${STRIPE_PRICE_MEDIUM:-}"
  "STRIPE_PRICE_LARGE=${STRIPE_PRICE_LARGE:-}"
  "MODERATOR_EMAIL=${MODERATOR_EMAIL:-kim@gracestack.se}"
  "VAPID_SUBJECT=${VAPID_SUBJECT:-mailto:gracestackab@gmail.com}"
  "AUDIT_IP_SALT=${AUDIT_IP_SALT:-}"
  "DAILY_BIBLE_AI_REVIEW=${DAILY_BIBLE_AI_REVIEW:-true}"
  "API_BIBLE_ID=${API_BIBLE_ID:-a556c5305ee15c3f-01}"
)

SECRET_ENV=()
[[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && SECRET_ENV+=("SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-role-key")
[[ -n "${STRIPE_SECRET_KEY:-}" ]] && SECRET_ENV+=("STRIPE_SECRET_KEY=secretref:stripe-secret-key")
[[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]] && SECRET_ENV+=("STRIPE_WEBHOOK_SECRET=secretref:stripe-webhook-secret")
[[ -n "${CRON_SECRET:-}" ]] && SECRET_ENV+=("CRON_SECRET=secretref:cron-secret")
[[ -n "${VAPID_PRIVATE_KEY:-}" ]] && SECRET_ENV+=("VAPID_PRIVATE_KEY=secretref:vapid-private-key")
if [[ -n "${RESEND_API_KEY:-}" ]]; then
  SECRET_ENV+=("RESEND_API_KEY=secretref:resend-api-key")
fi
[[ -n "${DATABASE_URL:-}" ]] && SECRET_ENV+=("DATABASE_URL=secretref:database-url")
[[ -n "${OPENROUTER_API_KEY:-}" ]] && SECRET_ENV+=("OPENROUTER_API_KEY=secretref:openrouter-api-key")
[[ -n "${API_BIBLE_KEY:-}" ]] && SECRET_ENV+=("API_BIBLE_KEY=secretref:api-bible-key")
[[ -n "${AZURE_OPENAI_API_KEY:-}" ]] && SECRET_ENV+=("AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key")

# AI-provider (Azure OpenAI föredras om satt)
if [[ -n "${AZURE_OPENAI_API_KEY:-}" && -n "${AZURE_OPENAI_ENDPOINT:-}" ]]; then
  ENV_VARS+=(
    "AI_PROVIDER=${AI_PROVIDER:-azure}"
    "AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}"
    "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION:-2024-08-01-preview}"
    "AZURE_OPENAI_CHAT_DEPLOYMENT=${AZURE_OPENAI_CHAT_DEPLOYMENT:-gpt-4-1-mini}"
    "AZURE_OPENAI_EMBED_DEPLOYMENT=${AZURE_OPENAI_EMBED_DEPLOYMENT:-text-embedding-3-small}"
  )
fi

az containerapp update -g "$RG" -n "$CA_NAME" \
  --image "$ACR_LOGIN/testimony-web:latest" \
  --set-env-vars "${ENV_VARS[@]}" "${SECRET_ENV[@]}" \
  -o none

echo "=== 5/6 ACA Cron Jobs ==="
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://$FQDN}"
CRON_SECRET_VAL="${CRON_SECRET:-}"
"$ROOT/azure/deploy-cron-jobs.sh" "$SITE_URL" "$CRON_SECRET_VAL"

echo ""
echo "✅ Azure-deploy klar"
echo "   App: https://$FQDN"
echo ""
echo "Nästa steg (DNS): peka testimony.se CNAME → $FQDN"
echo "Stripe webhook: https://testimony.se/api/stripe/webhook (efter DNS)"
echo "Supabase Site URL + redirect: https://testimony.se"
echo "Avveckla Vercel när DNS är verifierad."
