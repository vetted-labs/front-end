#!/usr/bin/env bash
# Pre-commit secret detection — scans staged files for potential secrets
set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Patterns that suggest hardcoded secrets
PATTERNS=(
  'AKIA[0-9A-Z]{16}'
  '(?i)(api[_-]?key|apikey)\s*[:=]\s*["\x27][a-zA-Z0-9]{16,}'
  '(?i)(secret|password|passwd|token)\s*[:=]\s*["\x27][^\s"'\'']{8,}'
  '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----'
  '(?i)sk-[a-zA-Z0-9]{20,}'
  '0x[a-fA-F0-9]{64}'
)

FOUND=0
for file in $STAGED_FILES; do
  if [[ "$file" == *.lock ]] || [[ "$file" == *.png ]] || [[ "$file" == *.jpg ]] || \
     [[ "$file" == *.woff* ]] || [[ "$file" == "scripts/check-secrets.sh" ]] || \
     [[ "$file" == "package-lock.json" ]]; then
    continue
  fi

  for pattern in "${PATTERNS[@]}"; do
    if git diff --cached -- "$file" | grep -Pq "$pattern" 2>/dev/null; then
      echo "⚠️  Potential secret found in: $file"
      echo "   Pattern: $pattern"
      FOUND=1
    fi
  done
done

if [ $FOUND -ne 0 ]; then
  echo ""
  echo "❌ Potential secrets detected in staged files."
  echo "   If these are false positives, commit with: git commit --no-verify"
  exit 1
fi

exit 0
