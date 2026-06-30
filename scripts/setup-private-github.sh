#!/usr/bin/env bash
# Skapa privat GitHub-repo för testimony (kräver gh inloggning).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Kör först: gh auth login"
  echo "   (välj GitHub.com → HTTPS → webbläsare eller token)"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "✓ origin finns redan: $(git remote get-url origin)"
else
  gh repo create testimony --private --source=. --remote=origin --description "testimony.se — privat repo (Gracestack AB)"
  echo "✓ Privat repo skapat"
fi

git push -u origin main
echo "✓ Pushad till privat repo"
