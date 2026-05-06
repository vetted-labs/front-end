# Frontend Security Review - front-end - 2026-04-28

## Analyzer-Run Summary

- semgrep: ran; 1 `react-dangerouslysetinnerhtml` result, dropped after trace review.
- eslint: ran; warnings were lint/style plus 2 `react/no-danger` instances, both dropped after trace review.
- npm audit: ran; production-only recheck reported 17 vulnerabilities: 6 high, 11 moderate.
- retire: ran; corroborated lodash advisories in installed artifacts.
- trivy: ran; corroborated Next, wallet-stack, lodash, h3, defu, picomatch, postcss, socket.io-parser, uuid, and bn.js advisories.
- secrets/source maps: `scripts/check-secrets.sh` returned no findings; `rg --files . -g '*.map' -g '!node_modules/**' -g '!.git/**'` returned no deployed source maps.

## Findings

| ID | Severity | Title | Proof |
|---|---|---|---|
| open-redirect-auth-redirect | Medium | Login/signup redirect parameter allows post-auth external navigation | Source-to-sink trace |
| forgeable-wallet-identity | High | Expert identity is sent as forgeable client-controlled wallet headers/body | Source-to-sink trace |
| vulnerable-next-runtime | High | Direct production Next.js runtime has high DoS/request handling advisories | npm audit + trivy |
| vulnerable-wallet-deps | High | Production wallet connector dependency tree contains high-risk vulnerable transitive packages | npm audit + trivy + retire |

## Detailed Findings

### [Medium] Login/signup redirect parameter allows post-auth external navigation

- id: `open-redirect-auth-redirect`
- cwe: CWE-601
- severity: Medium
- confidence: High
- analyzer-corroboration: none; concrete source-to-sink trace per requested proof bar
- threat-model:
  - attacker: unauthenticated visitor who can send a crafted login/signup URL to a victim
  - untrusted-input-boundary: URL search parameter `redirect`
  - reachability: Confirmed (trace)
- evidence:
  - source: `src/components/auth/LoginPage.tsx:41` - `const redirectUrl = searchParams.get("redirect");`
  - sink: `src/components/auth/LoginPage.tsx:77` - `router.push(redirectUrl || "/expert/dashboard");`
  - sink: `src/components/auth/LoginPage.tsx:220` - `router.push(redirectUrl || "/candidate/dashboard");`
  - sink: `src/components/auth/LoginPage.tsx:224` - `router.push(redirectUrl || "/dashboard");`
  - source: `src/components/auth/SignupPage.tsx:27` - `const redirectUrl = searchParams.get("redirect");`
  - sink: `src/components/auth/SignupPage.tsx:143` - `router.push(redirectUrl || "/candidate/dashboard");`
  - sink: `src/components/auth/SignupPage.tsx:153` - `router.push(redirectUrl || "/dashboard");`
  - framework behavior checked: `node_modules/next/dist/client/components/router-reducer/reducers/navigate-reducer.js:163` - `if (isExternalUrl) {`
  - framework behavior checked: `node_modules/next/dist/client/components/router-reducer/reducers/navigate-reducer.js:164` - `return handleExternalUrl(state, mutable, url.toString(), pendingPush);`
  - framework behavior checked: `node_modules/next/dist/client/components/app-router.js:275` - `location.assign(canonicalUrl);`
- sanitizer: none on direct login/signup redirect paths. The LinkedIn callback has an `isInternalPath` helper, but these direct sinks do not call it.
- false-positive-triage: not allowlisted as `router.push('/literal/path')`; the pushed value is attacker-controlled search-param data.
- remediation: reuse the LinkedIn callback's internal-path validation for all auth redirects. Accept only single-slash same-origin paths, reject `//host`, absolute URLs, and non-HTTP schemes, then fall back to the role dashboard.

### [High] Expert identity is sent as forgeable client-controlled wallet headers/body

- id: `forgeable-wallet-identity`
- cwe: CWE-287, CWE-602
- severity: High
- confidence: Medium
- analyzer-corroboration: none; concrete source-to-sink trace per requested proof bar
- threat-model:
  - attacker: authenticated low-privilege user or browser user able to edit localStorage / issue same API requests
  - untrusted-input-boundary: `localStorage` wallet state and client-supplied wallet fields
  - reachability: Confirmed (trace to sensitive outbound requests); backend acceptance was not exercised from this frontend-only repo
- evidence:
  - source: `src/contexts/AuthContext.tsx:78` - `if (!token && userType === 'expert' && expertId && walletAddress) {`
  - source: `src/contexts/AuthContext.tsx:161` - `localStorage.setItem('walletAddress', walletAddress);`
  - hop: `src/lib/api.ts:159` - `const { requiresAuth = false, _isRetry = false, headers = {}, body, ...fetchOptions } = options;`
  - hop: `src/lib/api.ts:181` - `// Backend verifyExpertWallet reads X-Wallet-Address for identity`
  - hop: `src/lib/api.ts:183` - `const walletAddress = localStorage.getItem("walletAddress");`
  - sink: `src/lib/api.ts:185` - `requestHeaders["X-Wallet-Address"] = walletAddress;`
  - sensitive sink: `src/lib/api.ts:662` - `reviewGuildApplication: (applicationId: string, data: Record<string, unknown>) =>`
  - sensitive sink: `src/lib/api.ts:663` - `apiRequest<{ message?: string }>(\`/api/experts/guild-applications/${applicationId}/review\`, {`
  - sensitive sink: `src/lib/api.ts:664` - `method: "POST",`
  - sensitive sink: `src/lib/api.ts:892` - `reviewCandidateApplication: (applicationId: string, data: Record<string, unknown>) => {`
  - sensitive sink: `src/lib/api.ts:893` - `const wallet = (data.wallet || data.walletAddress) as string;`
  - sensitive sink: `src/lib/api.ts:895` - `return apiRequest<{ message?: string }>(\`/api/guilds/candidate-applications/${applicationId}/review${query}\`, {`
  - hop: `src/components/GuildDetailView.tsx:279` - `const reviewData = {`
  - hop: `src/components/GuildDetailView.tsx:280` - `walletAddress: address,`
  - hop: `src/components/GuildDetailView.tsx:289` - `const response = applicationReviewType === "candidate"`
  - hop: `src/components/GuildDetailView.tsx:290` - `? await guildsApi.reviewCandidateApplication(selectedExpertMembershipApplication.id, reviewData)`
- sanitizer: wallet verification exists (`src/lib/api.ts:1206` - `verifyWallet: (address: string, signature: string, message: string) =>`), but the sensitive review request trace above does not carry a backend-issued session/JWT or per-request signature.
- false-positive-triage: this is not merely localStorage UI preference state; it is identity material copied into authentication/authorization headers and sensitive review requests.
- remediation: backend should derive expert identity from an HttpOnly session or JWT issued after SIWE/wallet verification, and should ignore `X-Wallet-Address`, query `wallet`, and body `walletAddress` as authorization facts. The frontend can still pass wallet addresses as display/context hints, but not as proof of identity.

### [High] Direct production Next.js runtime has high DoS/request handling advisories

- id: `vulnerable-next-runtime`
- cwe: CWE-400, CWE-444, CWE-502, CWE-770
- severity: High
- confidence: High
- analyzer-corroboration: `npm audit` GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3; `trivy` GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, CVE-2025-59471, CVE-2026-27980, CVE-2026-29057, CVE-2026-41305
- threat-model:
  - attacker: unauthenticated network attacker sending crafted requests to the self-hosted Next app
  - untrusted-input-boundary: HTTP request stream handled by Next.js
  - reachability: Confirmed production dependency
- evidence:
  - manifest: `package.json:34` - `"next": "15.5.9",`
  - lockfile: `package-lock.json:13374` - `"node_modules/next": {`
  - lockfile: `package-lock.json:13375` - `"version": "15.5.9",`
  - lockfile: `package-lock.json:13383` - `"postcss": "8.4.31",`
  - framework-defaults-checked: `next.config.ts:3` - `const nextConfig: NextConfig = {`
  - framework-defaults-checked: `next.config.ts:12` - `webpack: (config) => {`
- sanitizer: none applicable for dependency runtime advisories.
- false-positive-triage: not dev-only; `next` is a direct `dependencies` entry and `npm audit --omit=dev --json` still reports it. `npm ls --omit=dev next postcss` confirms `next@15.5.9` in the production tree.
- remediation: upgrade `next` to at least `15.5.15` per `npm audit` fix metadata, then rebuild and rerun `npm audit --omit=dev`, `trivy`, and smoke tests.

### [High] Production wallet connector dependency tree contains high-risk vulnerable transitive packages

- id: `vulnerable-wallet-deps`
- cwe: CWE-22, CWE-74, CWE-94, CWE-1321, CWE-1333, CWE-444, CWE-754
- severity: High
- confidence: Medium
- analyzer-corroboration: `npm audit` GHSA-r5fr-rjxr-66jc, GHSA-737v-mqg7-c878, GHSA-22cc-p3c6-wpvm, GHSA-mp2g-9vg9-f4cg, GHSA-677m-j7p3-52f9, GHSA-3v7f-55p6-f55p; `trivy` CVE-2026-4800, CVE-2026-35209, CVE-2026-23527, CVE-2026-33128, CVE-2026-33151, CVE-2026-33671; `retire` GHSA-r5fr-rjxr-66jc
- threat-model:
  - attacker: malicious wallet/relay peer, compromised dependency path, or crafted data reaching vulnerable wallet connector utilities
  - untrusted-input-boundary: wallet provider / WalletConnect / MetaMask SDK data handled by production wallet stack
  - reachability: Confirmed production dependency tree; specific vulnerable API call reachability in application code was not proven
- evidence:
  - manifest: `package.json:27` - `"@rainbow-me/rainbowkit": "^2.2.8",`
  - manifest: `package.json:41` - `"viem": "^2.37.6",`
  - manifest: `package.json:42` - `"wagmi": "^2.17.1"`
  - lockfile: `package-lock.json:10643` - `"node_modules/h3": {`
  - lockfile: `package-lock.json:10644` - `"version": "1.15.4",`
  - lockfile: `package-lock.json:10651` - `"defu": "^6.1.4",`
  - lockfile: `package-lock.json:8909` - `"node_modules/defu": {`
  - lockfile: `package-lock.json:8910` - `"version": "6.1.4",`
  - lockfile: `package-lock.json:12281` - `"node_modules/lodash": {`
  - lockfile: `package-lock.json:12282` - `"version": "4.17.21",`
  - lockfile: `package-lock.json:13990` - `"node_modules/picomatch": {`
  - lockfile: `package-lock.json:13991` - `"version": "2.3.1",`
  - lockfile: `package-lock.json:15236` - `"node_modules/socket.io-parser": {`
  - lockfile: `package-lock.json:15237` - `"version": "4.2.4",`
- sanitizer: none applicable for dependency advisories.
- false-positive-triage: not devDependency-only; `npm audit --omit=dev --json` still reports the same wallet-stack advisories and `npm ls --omit=dev` shows the path through `wagmi@2.17.1 -> @wagmi/connectors@5.10.1`.
- remediation: upgrade `wagmi` and `@rainbow-me/rainbowkit` to patched compatible releases or use overrides/resolutions to pull fixed `h3`, `defu`, `lodash`, `socket.io-parser`, `picomatch`, `uuid`, and `bn.js` versions where possible. Re-run the wallet connection flows after upgrade because `npm audit` suggests a semver-major `wagmi` fix path.

## Self-Critique

8 drafted, 4 dropped after self-critique, 4 remain.

Dropped candidates:

- Semgrep `dangerouslySetInnerHTML` at `DocsCodeBlock`: the source is static docs children (`src/app/docs/experts/commit-reveal-voting/page.tsx:115` and `:139`) passed through Shiki (`src/lib/docs-highlight.ts:46`), not user-controlled input.
- Markdown XSS: `react-markdown` is used without `rehypeRaw`; its installed default URL transform permits only safe protocols and returns `''` otherwise (`node_modules/react-markdown/lib/index.js:124`, `:421`, `:443`). The custom `renderMarkdown` returns React text nodes, not HTML.
- User profile/social `href` JavaScript URI XSS: several raw `href={link.url}` sinks exist, but React 19 blocks `javascript:` URL attributes in the installed runtime and production CSP has no `unsafe-inline` in `script-src`. This remains hardening work, not a surviving exploit finding here.
- Refresh tokens in localStorage: confirmed (`src/contexts/AuthContext.tsx:151`, `src/lib/api.ts:106`, `src/lib/api.ts:132`), but per the required allowlist this is not emitted without a surviving XSS path to steal it.

SECURITY REVIEW COMPLETE - 4 findings; proofs in REPORT.md; analyzer outputs in .sec/
