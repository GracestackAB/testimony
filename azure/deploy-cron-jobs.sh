#!/usr/bin/env bash
# Skapar/uppdaterar Container Apps Jobs för testimony.se cron-endpoints
set -euo pipefail

RG="${RG:-rg-gracestack-testimony-prod}"
CAE_NAME="${CAE_NAME:-cae-testimony}"
SITE_URL="${1:-${NEXT_PUBLIC_SITE_URL:-https://www.testimony.se}}"
CRON_SECRET="${2:-${CRON_SECRET:-}}"

if [[ -z "$CRON_SECRET" ]]; then
  echo "⚠️  CRON_SECRET saknas — cron-jobb skapas inte"
  exit 0
fi

SUB=$(az account show --query id -o tsv)

patch_job_curl() {
  local job_name="$1"
  local target_url="$2"
  local auth_header="Authorization: Bearer ${CRON_SECRET}"

  az rest --method PATCH \
    --url "https://management.azure.com/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.App/jobs/${job_name}?api-version=2024-03-01" \
    --body "$(az containerapp job show -g "$RG" -n "$job_name" -o json | jq \
      --arg url "$target_url" \
      --arg auth "$auth_header" \
      '{location: .location, properties: {template: {containers: [.properties.template.containers[0] | {name, image, command: ["curl"], args: ["-sfS","-H", $auth, $url], resources}], initContainers: .properties.template.initContainers, volumes: .properties.template.volumes}}}')" \
    -o none
}

# short_name|cron_utc|api_path
JOBS=(
  "daily-bible|0 5 * * *|/api/cron/daily-bible"
  "weekly-digest|0 8 * * 1|/api/cron/weekly-digest"
  "youtube|0 6 * * *|/api/cron/youtube"
  "notifications|0 7 * * *|/api/notifications/dispatch"
)

for entry in "${JOBS[@]}"; do
  IFS='|' read -r short cron path <<< "$entry"
  JOB_NAME="job-testimony-${short}"
  TARGET_URL="${SITE_URL%/}${path}"

  if az containerapp job show -g "$RG" -n "$JOB_NAME" &>/dev/null; then
    echo "→ uppdaterar $JOB_NAME"
    az containerapp job update -g "$RG" -n "$JOB_NAME" \
      --cron-expression "$cron" \
      -o none
    patch_job_curl "$JOB_NAME" "$TARGET_URL"
  else
    echo "→ skapar $JOB_NAME ($cron → $TARGET_URL)"
    az containerapp job create -g "$RG" -n "$JOB_NAME" \
      --environment "$CAE_NAME" \
      --trigger-type Schedule \
      --cron-expression "$cron" \
      --replica-timeout 300 \
      --replica-retry-limit 1 \
      --replica-completion-count 1 \
      --parallelism 1 \
      --image curlimages/curl:8.11.1 \
      --cpu 0.25 --memory 0.5Gi \
      --command "curl" \
      --args "${TARGET_URL}" \
      -o none
    patch_job_curl "$JOB_NAME" "$TARGET_URL"
  fi
done

echo "✓ ACA cron jobs klara"
