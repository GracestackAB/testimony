#!/usr/bin/env bash
# Self-hosted Supabase API (GoTrue + PostgREST + Caddy gateway) mot Azure PostgreSQL
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
LOC="${LOC:-swedencentral}"
ACR_NAME="${ACR_NAME:-acrtestimonysc}"
CAE_NAME="${CAE_NAME:-cae-testimony}"
KV_NAME="${KV_NAME:-kv-testimony-sc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

GOTRUE_APP="${GOTRUE_APP:-ca-testimony-gotrue}"
GOTRUE_IMAGE="${GOTRUE_IMAGE:-supabase/gotrue:v2.170.0}"
POSTGREST_APP="${POSTGREST_APP:-ca-testimony-postgrest}"
GATEWAY_APP="${GATEWAY_APP:-ca-testimony-api}"

[[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL saknas i $ENV_FILE"
  exit 1
fi

az extension add --name containerapp --upgrade -y 2>/dev/null || true

echo "=== JWT-nycklar ==="
JWT_JSON=$(node "$ROOT/scripts/generate-supabase-jwt.mjs")
JWT_SECRET=$(echo "$JWT_JSON" | jq -r .JWT_SECRET)
ANON_KEY=$(echo "$JWT_JSON" | jq -r .ANON_KEY)
SERVICE_KEY=$(echo "$JWT_JSON" | jq -r .SERVICE_ROLE_KEY)

SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://www.testimony.se}"
ALLOW_LIST="${SITE_URL}/**,https://testimony.se/**,https://ca-testimony-prod.livelyflower-b897116b.swedencentral.azurecontainerapps.io/**"

echo "=== Key Vault ==="
store_secret() {
  local n="$1" v="$2"
  az keyvault secret set --vault-name "$KV_NAME" -n "$n" --value "$v" -o none 2>/dev/null || true
}
store_secret testimony-jwt-secret "$JWT_SECRET"
store_secret testimony-anon-key "$ANON_KEY"
store_secret testimony-service-role-key "$SERVICE_KEY"

echo "=== GoTrue ==="
if az containerapp show -g "$RG" -n "$GOTRUE_APP" &>/dev/null; then
  az containerapp update -g "$RG" -n "$GOTRUE_APP" --image "$GOTRUE_IMAGE" -o none
else
  az containerapp create -g "$RG" -n "$GOTRUE_APP" \
    --environment "$CAE_NAME" \
    --ingress external --target-port 9999 \
    --min-replicas 1 --max-replicas 2 \
    --cpu 0.5 --memory 1Gi \
    --image "$GOTRUE_IMAGE" \
    --secrets "jwt-secret=$JWT_SECRET" "db-url=$DATABASE_URL" \
    --env-vars \
      "GOTRUE_API_HOST=0.0.0.0" \
      "GOTRUE_API_PORT=9999" \
      "GOTRUE_DB_DRIVER=postgres" \
      "GOTRUE_DB_DATABASE_URL=secretref:db-url" \
      "GOTRUE_JWT_SECRET=secretref:jwt-secret" \
      "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated" \
      "GOTRUE_SITE_URL=$SITE_URL" \
      "GOTRUE_URI_ALLOW_LIST=$ALLOW_LIST" \
      "GOTRUE_DISABLE_SIGNUP=false" \
      "GOTRUE_EXTERNAL_EMAIL_ENABLED=true" \
      "GOTRUE_MAILER_AUTOCONFIRM=true" \
      "GOTRUE_DB_AUTOMIGRATE=false" \
    -o none
fi

echo "=== PostgREST ==="
if az containerapp show -g "$RG" -n "$POSTGREST_APP" &>/dev/null; then
  az containerapp update -g "$RG" -n "$POSTGREST_APP" -o none
else
  az containerapp create -g "$RG" -n "$POSTGREST_APP" \
    --environment "$CAE_NAME" \
    --ingress external --target-port 3000 \
    --min-replicas 1 --max-replicas 2 \
    --cpu 0.5 --memory 1Gi \
    --image postgrest/postgrest:v12.2.3 \
    --secrets "jwt-secret=$JWT_SECRET" "db-url=$DATABASE_URL" \
    --env-vars \
      "PGRST_DB_URI=secretref:db-url" \
      "PGRST_DB_SCHEMAS=testimony,public,auth,storage" \
      "PGRST_DB_ANON_ROLE=anon" \
      "PGRST_JWT_SECRET=secretref:jwt-secret" \
      "PGRST_SERVER_PORT=3000" \
    -o none
fi

GOTRUE_HOST=$(az containerapp show -g "$RG" -n "$GOTRUE_APP" --query properties.configuration.ingress.fqdn -o tsv)
POSTGREST_HOST=$(az containerapp show -g "$RG" -n "$POSTGREST_APP" --query properties.configuration.ingress.fqdn -o tsv)

echo "   GoTrue internal: $GOTRUE_HOST"
echo "   PostgREST internal: $POSTGREST_HOST"

echo "=== DB: golang-migrate + postgres-roll (engångsfix vid Supabase-dump) ==="
node -e "
const {execSync}=require('child_process');
const url=process.env.DATABASE_URL;
if(!url) process.exit(0);
const sql=\`
TRUNCATE public.schema_migrations;
INSERT INTO public.schema_migrations (version, dirty) VALUES (20241009103726, false);
TRUNCATE auth.schema_migrations;
INSERT INTO auth.schema_migrations (version, dirty) VALUES (20241009103726, false);
DO \\\$\\\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres NOLOGIN; END IF; END \\\$\\\$;
GRANT postgres TO testimonyadmin;
GRANT USAGE ON SCHEMA testimony TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA testimony TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA testimony TO authenticated;
\`;
execSync('psql \"'+url+'\" -v ON_ERROR_STOP=1 -c \"'+sql.replace(/\"/g,'\\\\\"')+'\"',{stdio:'inherit'});
" 2>/dev/null || echo "   (hoppar över DB-fix om psql saknas)"

# GoTrue queries auth.users without schema prefix — role needs search_path
if [[ -n "${DATABASE_URL:-}" ]] && command -v psql &>/dev/null; then
  DB_USER=$(node -e "console.log(new URL(process.env.DATABASE_URL.replace('postgresql://','postgres://')).username)")
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "ALTER ROLE \"${DB_USER}\" SET search_path TO auth, public, testimony;" 2>/dev/null \
    && echo "   GoTrue search_path set for role ${DB_USER}" \
    || echo "   (kunde inte sätta search_path)"
fi

echo "=== Gateway (nginx) ==="
az acr build --registry "$ACR_NAME" --image testimony-api-gateway:latest "$ROOT/azure/auth-api" -o none

ACR_LOGIN=$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)

if az containerapp show -g "$RG" -n "$GATEWAY_APP" &>/dev/null; then
  az containerapp update -g "$RG" -n "$GATEWAY_APP" \
    --image "$ACR_LOGIN/testimony-api-gateway:latest" \
    -o none
else
  az containerapp create -g "$RG" -n "$GATEWAY_APP" \
    --environment "$CAE_NAME" \
    --ingress external --target-port 8080 \
    --min-replicas 1 --max-replicas 2 \
    --cpu 0.25 --memory 0.5Gi \
    --image "$ACR_LOGIN/testimony-api-gateway:latest" \
    --registry-server "$ACR_LOGIN" \
    --registry-identity system \
    --system-assigned \
    -o none
  PID=$(az containerapp show -g "$RG" -n "$GATEWAY_APP" --query identity.principalId -o tsv)
  ACR_ID=$(az acr show -n "$ACR_NAME" -g "$RG" --query id -o tsv)
  az role assignment create --assignee "$PID" --role AcrPull --scope "$ACR_ID" -o none 2>/dev/null || true
fi

API_FQDN=$(az containerapp show -g "$RG" -n "$GATEWAY_APP" --query properties.configuration.ingress.fqdn -o tsv)
API_URL="https://${API_FQDN}"

GOOGLE_ID="${GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID:-}"
# Google OAuth callback via www (Next.js proxar /auth/v1 → API-gateway)
GOOGLE_REDIRECT_URI="${SITE_URL:-https://www.testimony.se}/auth/v1/callback"
GOTRUE_ENV=(
  "API_EXTERNAL_URL=${SITE_URL}/auth/v1"
  "GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}"
  "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated"
)
if [[ -n "$GOOGLE_ID" ]]; then
  GOTRUE_ENV+=(
    "GOTRUE_EXTERNAL_GOOGLE_ENABLED=true"
    "GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=${GOOGLE_ID}"
    "GOTRUE_EXTERNAL_GOOGLE_SECRET=secretref:google-secret"
  )
fi

# Resend SMTP — lösenordsåterställning, magic link m.m.
RESEND_KEY="${RESEND_API_KEY:-}"
SMTP_ADMIN="${GOTRUE_SMTP_ADMIN_EMAIL:-${MODERATOR_EMAIL:-noreply@gracestack.se}}"
SMTP_SENDER="${GOTRUE_SMTP_SENDER_NAME:-testimony.se}"
if [[ -n "$RESEND_KEY" ]]; then
  echo "=== Resend SMTP på GoTrue ==="
  az containerapp secret set -g "$RG" -n "$GOTRUE_APP" \
    --secrets "resend-smtp-pass=$RESEND_KEY" -o none 2>/dev/null || true
  store_secret resend-api-key "$RESEND_KEY"
  GOTRUE_ENV+=(
    "GOTRUE_SMTP_HOST=smtp.resend.com"
    "GOTRUE_SMTP_PORT=465"
    "GOTRUE_SMTP_USER=resend"
    "GOTRUE_SMTP_PASS=secretref:resend-smtp-pass"
    "GOTRUE_SMTP_ADMIN_EMAIL=$SMTP_ADMIN"
    "GOTRUE_SMTP_SENDER_NAME=$SMTP_SENDER"
    "GOTRUE_MAILER_AUTOCONFIRM=true"
    "GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify"
  )
else
  echo "⚠️  RESEND_API_KEY saknas — GoTrue SMTP hoppas över (lägg i .env.local)"
  GOTRUE_ENV+=("GOTRUE_MAILER_AUTOCONFIRM=true")
fi
az containerapp update -g "$RG" -n "$GOTRUE_APP" \
  --set-env-vars "${GOTRUE_ENV[@]}" \
  -o none

echo ""
echo "✅ Auth API: $API_URL"
echo ""
echo "Uppdatera .env.local:"
echo "  NEXT_PUBLIC_SUPABASE_URL=${SITE_URL}"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<spara i Key Vault testimony-anon-key>"
echo "  SUPABASE_SERVICE_ROLE_KEY=<spara i Key Vault testimony-service-role-key>"
echo ""
echo "Kör sedan: ./azure/deploy-azure.sh"
