#!/usr/bin/env bash
# Test jeres egen scheduled Goma-sync (Vercel / prod).
#
# Brug:
#   export SITE_URL="https://functionalfoods.dk"
#   export CRON_SECRET="samme-værdi-som-i-vercel"
#   bash scripts/test-scheduled-sync.sh
#
# Eller på én linje:
#   SITE_URL=https://functionalfoods.dk CRON_SECRET='...' bash scripts/test-scheduled-sync.sh
#
# Kræver: curl (jq valgfrit — uden jq printes rå JSON).

set -euo pipefail

if [[ -z "${SITE_URL:-}" ]]; then
  echo "Sæt SITE_URL (fx https://functionalfoods.dk)" >&2
  exit 1
fi

ENDPOINT="${SITE_URL%/}/api/admin/goma/scheduled-sync"
echo "POST $ENDPOINT"

CURL_HEADERS=( -H "Content-Type: application/json" )
if [[ -n "${CRON_SECRET:-}" ]]; then
  CURL_HEADERS+=( -H "x-cron-secret: $CRON_SECRET" )
else
  echo "Bemærk: CRON_SECRET ikke sat — kalder uden x-cron-secret (virker kun hvis Vercel heller ikke har CRON_SECRET)." >&2
fi

TMP="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$TMP" -w '%{http_code}' -X POST \
  "${CURL_HEADERS[@]}" \
  --max-time 300 \
  "$ENDPOINT" || true)"

echo "HTTP status: $HTTP_CODE"
echo "Body:"
if command -v jq >/dev/null 2>&1; then
  jq . <"$TMP" || cat "$TMP"
else
  cat "$TMP"
fi
rm -f "$TMP"
