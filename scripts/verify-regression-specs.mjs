#!/usr/bin/env node
// scripts/verify-regression-specs.mjs
//
// CI gate for the M1.3 wallet-session-handshake regression coverage.
//
// Lists the Playwright real-flow suite via `--list --reporter=json` and fails
// the run if either required spec file is missing. The Playwright JSON
// reporter prints to stdout, sometimes prefixed by a banner on stderr — we
// only parse stdout.
//
// Required specs (annotated `@regression-auth-handshake`):
//   - e2e/real-flow/scenarios/guild-feed/01-wallet-session-handshake.spec.ts
//   - e2e/real-flow/scenarios/guild-feed/12-token-expiry-refresh.spec.ts
//
// Exit codes:
//   0  all required specs are discoverable
//   1  at least one required spec is missing
//   2  Playwright list failed (e.g. config error)

import { execSync } from "node:child_process";

const REQUIRED = [
  "e2e/real-flow/scenarios/guild-feed/01-wallet-session-handshake.spec.ts",
  "e2e/real-flow/scenarios/guild-feed/12-token-expiry-refresh.spec.ts",
];

let listJson;
try {
  listJson = execSync(
    "npx playwright test --config=e2e/real-flow/playwright.real-flow.config.ts --list --reporter=json",
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (err) {
  console.error("verify-regression-specs: playwright --list failed");
  if (err.stderr) console.error(err.stderr.toString());
  if (err.stdout) console.error(err.stdout.toString());
  process.exit(2);
}

let data;
try {
  data = JSON.parse(listJson);
} catch (err) {
  console.error("verify-regression-specs: could not parse Playwright JSON output");
  console.error(err.message);
  process.exit(2);
}

const specPaths = new Set();
function walk(suite) {
  if (Array.isArray(suite.specs)) {
    for (const spec of suite.specs) {
      if (spec.file) specPaths.add(spec.file);
    }
  }
  if (Array.isArray(suite.suites)) {
    for (const child of suite.suites) walk(child);
  }
}
if (Array.isArray(data.suites)) {
  for (const root of data.suites) walk(root);
}

const collected = [...specPaths];
// Playwright JSON emits paths relative to the config's `testDir`
// (e.g. `scenarios/guild-feed/...` for the real-flow config whose testDir is
// `e2e/real-flow`). The REQUIRED list uses repo-relative paths. Match in
// either direction so the gate keeps working if a future Playwright version
// emits absolute paths instead.
const matches = (required, discovered) =>
  required === discovered ||
  required.endsWith(discovered) ||
  discovered.endsWith(required);
const missing = REQUIRED.filter(
  (p) => !collected.some((sp) => matches(p, sp)),
);

if (missing.length > 0) {
  console.error("MISSING REGRESSION SPECS — these MUST exist:");
  for (const p of missing) console.error("  - " + p);
  console.error("");
  console.error("Discovered " + collected.length + " spec file(s):");
  for (const p of collected) console.error("  • " + p);
  process.exit(1);
}

console.log("All required regression specs present:");
for (const p of REQUIRED) console.log("  ✓ " + p);
process.exit(0);
