# CI/CD & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-commit hooks, GitHub Actions CI, Dependabot, and security linting to enforce code quality and catch issues before they reach production.

**Architecture:** Husky runs git hooks locally (pre-commit runs lint-staged + secret scanning, commit-msg runs commitlint). GitHub Actions CI runs lint, typecheck, unit tests, security audit, and build on every PR. Dependabot opens PRs for dependency updates. ESLint config is consolidated from two files into one with security rules merged in.

**Tech Stack:** husky, lint-staged, @commitlint/cli, @commitlint/config-conventional, GitHub Actions, Dependabot

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install husky, lint-staged, and commitlint**

```bash
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Initialize husky**

```bash
npx husky init
```

This creates `.husky/` directory and a sample `pre-commit` hook.

- [ ] **Step 3: Add prepare script to package.json**

Husky init should add this automatically, but verify `package.json` has:
```json
"prepare": "husky"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .husky/
git commit -m "chore: install husky, lint-staged, and commitlint"
```

---

### Task 2: Configure lint-staged

**Files:**
- Create: `.lintstagedrc.json`

- [ ] **Step 1: Create lint-staged config**

Create `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": ["eslint --fix --max-warnings 0"],
  "*.{ts,tsx,js,jsx,json,md}": ["prettier --write"]
}
```

Note: If prettier is not installed, use only the eslint command:
```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix --max-warnings 0"]
}
```

Since the project doesn't use Prettier currently, go with the eslint-only version.

- [ ] **Step 2: Commit**

```bash
git add .lintstagedrc.json
git commit -m "chore: configure lint-staged for pre-commit linting"
```

---

### Task 3: Configure commitlint

**Files:**
- Create: `.commitlintrc.json`

- [ ] **Step 1: Create commitlint config**

Create `.commitlintrc.json`:
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", [
      "feat", "fix", "refactor", "chore", "docs", "style",
      "test", "perf", "ci", "build", "revert"
    ]],
    "subject-max-length": [2, "always", 100]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .commitlintrc.json
git commit -m "chore: configure commitlint for conventional commits"
```

---

### Task 4: Create secret detection script

**Files:**
- Create: `scripts/check-secrets.sh`

- [ ] **Step 1: Create the script**

Create `scripts/check-secrets.sh`:
```bash
#!/usr/bin/env bash
# Pre-commit secret detection — scans staged files for potential secrets
set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Patterns that suggest hardcoded secrets
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                          # AWS Access Key
  '(?i)(api[_-]?key|apikey)\s*[:=]\s*["\x27][a-zA-Z0-9]{16,}'  # API keys
  '(?i)(secret|password|passwd|token)\s*[:=]\s*["\x27][^\s"'\'']{8,}'  # Secrets/passwords
  '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----'  # Private keys
  '(?i)sk-[a-zA-Z0-9]{20,}'                   # OpenAI-style keys
  '0x[a-fA-F0-9]{64}'                         # Private keys (hex)
)

FOUND=0
for file in $STAGED_FILES; do
  # Skip binary files, lock files, and this script itself
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
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/check-secrets.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/check-secrets.sh
git commit -m "chore: add pre-commit secret detection script"
```

---

### Task 5: Wire up husky hooks

**Files:**
- Modify: `.husky/pre-commit`
- Create: `.husky/commit-msg`

- [ ] **Step 1: Configure pre-commit hook**

Write `.husky/pre-commit`:
```bash
npx lint-staged
bash scripts/check-secrets.sh
```

- [ ] **Step 2: Create commit-msg hook**

Write `.husky/commit-msg`:
```bash
npx --no -- commitlint --edit $1
```

- [ ] **Step 3: Test the hooks**

Make a trivial change (add a newline to a file), stage it, and try to commit with a bad message:
```bash
git commit -m "bad message"
```
Expected: commitlint rejects it.

Then try with a good message:
```bash
git commit -m "chore: test commit hooks"
```
Expected: lint-staged runs, secret check runs, commitlint passes, commit succeeds.

- [ ] **Step 4: Commit**

```bash
git add .husky/pre-commit .husky/commit-msg
git commit -m "chore: wire up husky pre-commit and commit-msg hooks"
```

---

### Task 6: Consolidate ESLint config

**Files:**
- Modify: `eslint.config.mjs`
- Delete: `.eslintrc.json`

The project has two ESLint configs: `eslint.config.mjs` (flat config, active) and `.eslintrc.json` (legacy, unused by ESLint 9 but has good security rules). Merge the useful rules from `.eslintrc.json` into the flat config and delete the legacy file.

- [ ] **Step 1: Merge security rules into eslint.config.mjs**

Add to `eslint.config.mjs` rules block:
```javascript
// Security rules (merged from .eslintrc.json)
"no-eval": "error",
"no-implied-eval": "error",
"no-new-func": "error",
"react/no-danger": "warn",
"no-restricted-imports": ["error", {
  patterns: [
    {
      group: ["pg", "postgres", "postgresql"],
      message: "❌ SECURITY: Frontend must NEVER access database directly. Use backend API."
    },
    {
      group: ["**/db.ts", "**/db.js", "*/db"],
      message: "❌ SECURITY: Frontend must NEVER import database utilities. Use backend API."
    },
    {
      group: ["**/backend/**", "../backend/**", "../../backend/**"],
      message: "❌ ARCHITECTURE: Frontend must NEVER import backend code. Use API calls."
    }
  ]
}],
```

- [ ] **Step 2: Delete legacy config**

```bash
rm .eslintrc.json
```

- [ ] **Step 3: Run eslint to verify config works**

```bash
npx eslint --max-warnings 999 src/app/page.tsx
```
Expected: runs without config errors.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git rm .eslintrc.json
git commit -m "refactor: consolidate ESLint configs and merge security rules into flat config"
```

---

### Task 7: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: dummy-ci-value
          NEXT_PUBLIC_API_URL: http://localhost:4000
          NEXT_PUBLIC_LINKEDIN_CLIENT_ID: dummy-ci-value

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high
```

- [ ] **Step 2: Add typecheck script to package.json**

Add to `package.json` scripts:
```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "ci: add GitHub Actions workflow for lint, test, build, and security audit"
```

---

### Task 8: Create Dependabot config

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create Dependabot config**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
      major:
        update-types:
          - major
    labels:
      - dependencies
    commit-message:
      prefix: "chore(deps):"

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    labels:
      - ci
    commit-message:
      prefix: "ci(deps):"
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot config for weekly dependency updates"
```

---

### Task 9: Add npm audit script and final package.json cleanup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add security and CI convenience scripts**

Add to `package.json` scripts:
```json
"lint:fix": "eslint --fix",
"security:audit": "npm audit --audit-level=high",
"check-secrets": "bash scripts/check-secrets.sh",
"ci": "npm run lint && npm run typecheck && npm test && npm run build"
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add security audit and CI convenience scripts"
```

---

### Task 10: Verify everything works end-to-end

- [ ] **Step 1: Test pre-commit hook with bad commit message**

```bash
echo "// test" >> src/app/page.tsx
git add src/app/page.tsx
git commit -m "bad message"
```
Expected: commitlint rejects it.

- [ ] **Step 2: Test pre-commit hook with valid commit**

```bash
git checkout -- src/app/page.tsx
```

- [ ] **Step 3: Verify CI script runs locally**

```bash
npm run lint && npm run typecheck && npm test
```
Expected: all pass.

- [ ] **Step 4: Verify secret detection catches a fake key**

```bash
echo 'const key = "AKIAIOSFODNN7EXAMPLE1"' > /tmp/test-secret.ts
cp /tmp/test-secret.ts src/test-secret.ts
git add src/test-secret.ts
bash scripts/check-secrets.sh
```
Expected: warns about potential secret.

```bash
git checkout -- . && rm -f src/test-secret.ts
git reset HEAD src/test-secret.ts 2>/dev/null
```
