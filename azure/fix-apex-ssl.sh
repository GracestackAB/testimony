#!/usr/bin/env bash
# Apex SSL med HTTP-validering (inte TXT) — korrekt enligt Azure ACA-dokumentation.
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
CAE="${CAE:-cae-testimony}"
CA="${CA:-ca-testimony-prod}"
CERT="${CERT:-cert-testimony-apex}"
HOST="${HOST:-testimony.se}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

# Loopia-credentials från miljö eller testimony .env
[[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }
export LOOPIA_API_USER="${LOOPIA_API_USER:-cursor5@loopiaapi}"
export LOOPIA_API_PASSWORD="${LOOPIA_API_PASSWORD:-${LOOPIA_API_PASS:-}}"

if [[ -z "${LOOPIA_API_PASSWORD:-}" ]]; then
  for f in "$HOME/CascadeProjects/msblistan/.env.local" "$HOME/CascadeProjects/nexus/.env"; do
    [[ -f "$f" ]] && { set -a; source "$f"; set +a; LOOPIA_API_PASSWORD="${LOOPIA_API_PASSWORD:-${LOOPIA_API_PASS:-}}"; break; }
  done
fi

STATIC_IP=$(az containerapp env show -g "$RG" -n "$CAE" --query properties.staticIp -o tsv)
echo "=== Apex SSL (HTTP-validering) för $HOST ==="
echo "   ACA static IP: $STATIC_IP"

# 1) Ta bort misslyckat/gammalt cert
if az containerapp env certificate show -g "$RG" -n "$CAE" --certificate "$CERT" &>/dev/null; then
  STATE=$(az containerapp env certificate list -g "$RG" -n "$CAE" -o json | jq -r --arg n "$CERT" '.[]|select(.name==$n)|.properties.provisioningState')
  echo "   Befintligt cert: $STATE — raderar för ny HTTP-validering"
  az containerapp env certificate delete -g "$RG" -n "$CAE" --certificate "$CERT" -y -o none
  sleep 8
fi

# 2) DNS: A-record + asuid TXT + CAA för DigiCert
if [[ -n "${LOOPIA_API_PASSWORD:-}" ]]; then
  echo "=== Loopia DNS ==="
  python3 "$ROOT/azure/loopia_dns_apex_ssl.py" --env-file "$ENV_FILE" "$STATIC_IP"
else
  echo "⚠️  Loopia-credentials saknas — kontrollera A @$STATIC_IP och CAA digicert.com manuellt"
fi

# 3) Säkerställ hostname finns
az containerapp hostname add -g "$RG" -n "$CA" --hostname "$HOST" -o none 2>/dev/null || true

# 4) Skapa cert med HTTP-validering (apex kräver detta, inte TXT)
echo "=== Skapar managed cert (HTTP) ==="
az containerapp env certificate create \
  -g "$RG" \
  -n "$CAE" \
  --certificate-name "$CERT" \
  --hostname "$HOST" \
  --validation-method HTTP \
  -o none

echo "=== Väntar på validering (max 15 min) ==="
for i in $(seq 1 60); do
  STATE=$(az containerapp env certificate list -g "$RG" -n "$CAE" -o json \
    | jq -r --arg n "$CERT" '.[] | select(.name==$n) | .properties.provisioningState')
  ERR=$(az containerapp env certificate list -g "$RG" -n "$CAE" -o json \
    | jq -r --arg n "$CERT" '.[] | select(.name==$n) | .properties.error // empty')
  echo "   [$i] $STATE${ERR:+ ($ERR)}"
  [[ "$STATE" == "Succeeded" ]] && break
  [[ "$STATE" == "Failed" ]] && exit 1
  sleep 15
done

[[ "$STATE" != "Succeeded" ]] && { echo "⚠️  Fortfarande $STATE — deploya middleware (.well-known) och kör igen"; exit 0; }

echo "=== Binder $HOST (HTTP-validering) ==="
az containerapp hostname bind -g "$RG" -n "$CA" \
  --hostname "$HOST" \
  --environment "$CAE" \
  --certificate "$CERT" \
  --validation-method HTTP \
  -o none

echo "✅ Apex SSL klart: https://$HOST"
curl -sfS -o /dev/null -w "   HTTPS: %{http_code}\n" "https://$HOST/" || true
