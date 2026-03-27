# CLAUDE.md

## Git Commits

- NEVER add "Co-Authored-By: Claude" or similar attribution to commit messages
- Use conventional commit format (`feat:`, `fix:`, `refactor:`, `chore:`, etc.)
- Focus on the "why", not the "what"

## Project Overview

**Vetted** is a decentralized hiring platform on Next.js 15 (App Router) + React 19. Companies post jobs, experts in guilds review candidates, and reputation is staked on-chain. Web3 wallet auth via RainbowKit + Wagmi.

## Quick Reference

```bash
npm run dev        # Dev server with Turbopack (default port 3000)
npm run build      # Production build (no Turbopack)
npm start          # Start production server
npm run lint       # ESLint
```

- `dotenv-cli` loads `.env.local` automatically in dev/start scripts
- Backend API: `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:4000`)
- Path alias: `@/` → `./src/`

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages (thin shells only)
├── components/             # All UI components
│   ├── ui/                 # Shared primitives (Button, Input, Modal, Alert, etc.)
│   ├── guild/              # Guild-specific components
│   ├── guilds/             # Guilds listing/overview
│   ├── home/               # Homepage sections
│   ├── jobs/               # Job form sections
│   ├── dashboard/          # Dashboard-specific components
│   ├── endorsements/       # Endorsement components
│   ├── expert/             # Expert-specific components
│   ├── browse/             # Browse page components
│   ├── candidate/          # Candidate components
│   └── layout/             # Layout components
├── config/
│   └── constants.ts        # Form options, enums (JOB_TYPES, SKILLS, etc.)
├── contexts/
│   └── AuthContext.tsx      # Single auth context (candidate/company/expert)
├── hooks/
│   ├── useAuthContext.ts    # Auth context consumer hook
│   └── useJobForm.ts       # Job form logic
├── lib/
│   ├── api.ts              # API client — ALL backend calls go through here
│   ├── auth.ts             # Token management helpers
│   ├── utils.ts            # General utilities (cn, formatters, etc.)
│   ├── validation.ts       # Input validation (validateMinLength, etc.)
│   ├── guildHelpers.ts     # Guild-related helpers
│   └── hooks/
│       ├── useFetch.ts     # Generic data-fetching hooks (useFetch, useApi)
│       ├── useVettedContracts.ts  # On-chain contract interactions
│       ├── useGuilds.ts    # Guild data hook
│       ├── useClickOutside.ts
│       ├── useMountEffect.ts
│       ├── useMessagePolling.ts
│       └── useWalletVerification.ts
└── types/                  # All TypeScript types (job, guild, expert, candidate, application, proposal)
```

### Key Patterns

**Page structure:** `page.tsx` (thin shell) → container component (data + logic) → presentational sub-components.

**API calls:** Always use `apiRequest()` or the domain-specific API namespaces from `lib/api.ts` (`authApi`, `jobsApi`, `expertApi`, `guildsApi`, `candidateApi`, `companyApi`, `applicationsApi`, `proposalsApi`, `governanceApi`, `endorsementAccountabilityApi`, `commitRevealApi`, etc.). Never use raw `fetch`.

**Data fetching in components:** Use `useFetch` or `useApi` hooks from `lib/hooks/useFetch.ts` for loading/error state management. Never write manual `useState(isLoading)` + try/catch patterns. For paginated data, use `usePaginatedFetch` from `lib/hooks/usePaginatedFetch.ts`.

**Auth guards:** Use `useRequireAuth(userType)` from `lib/hooks/useRequireAuth.ts` instead of manual `useEffect` + auth check + redirect patterns.

**Client-side pagination:** Use `useClientPagination(items, perPage)` from `lib/hooks/useClientPagination.ts` instead of manual `currentPage` state + `.slice()` math.

**Auth:** Three user types — `candidate`, `company`, `expert`. Candidates/companies use JWT tokens. Experts use wallet-only auth (no token). Access via `useAuthContext()` from `src/hooks/useAuthContext.ts`.

**Error handling:** Use `ApiError` class from `lib/api.ts`. Display errors via the `Alert` component (`variant="error"`) or `toast` from `sonner`.

**Types:** Always import from `@/types`. Never define types inline in components when a shared type exists.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5, React 19, TypeScript (strict) |
| Styling | TailwindCSS 4, Radix UI primitives, Lucide icons |
| Fonts | Inter (sans), Bree Serif (serif), Bricolage Grotesque (display) |
| Web3 | Wagmi, Viem, RainbowKit (MetaMask + Coinbase Wallet) |
| State | Local `useState`, TanStack Query (via RainbowKit), `AuthContext` |
| Toasts | Sonner |
| Env | `dotenv-cli` for `.env.local` loading |

### Provider Stack (layout.tsx)

`WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider` → `ThemeProvider` → `AuthProvider` + `ErrorBoundary` + `RouteChangeOverlay`

## useEffect Rules

Direct `useEffect` is restricted via ESLint (`no-restricted-syntax`, warn level). Use these alternatives instead:

1. **Derived state** — Compute inline or `useMemo`, never `useEffect(() => setX(f(y)), [y])`
2. **Data fetching** — Use `useFetch` / `useApi` from `lib/hooks/useFetch.ts`
3. **User actions** — Handle in event callbacks, not effects
4. **External system sync on mount** — Use `useMountEffect` from `lib/hooks/useMountEffect.ts`
5. **Click outside** — Use `useClickOutside` from `lib/hooks/useClickOutside.ts`
6. **Message polling** — Use `useMessagePolling` from `lib/hooks/useMessagePolling.ts`

Legitimate uses of raw `useEffect` (add `// eslint-disable-next-line no-restricted-syntax` with a comment explaining why):
- Effects with runtime dependencies (blockchain confirmations, wagmi status changes, theme, pathname)
- Effects inside shared hooks (`useFetch`, `useClickOutside`, etc.) that _are_ the abstraction
- Subscribing to DOM/window events that depend on changing state

## Code Quality Rules

### Do

- Use `apiRequest()` or domain API namespaces — never raw `fetch`
- Use `useFetch`/`useApi` hooks for data fetching in components
- Use `useFetch()` for data loaded on mount or when dependencies change
- Use `useApi()` for imperative operations (form submissions, button clicks, mutations)
- Use `extractApiError(error, "Context-specific fallback")` in any remaining try/catch blocks
- Always show user feedback on errors: `toast.error()` for transient, `<Alert>` for persistent
- Import types from `@/types` — keep type definitions in `src/types/`
- Keep `page.tsx` files as thin routing shells (import + render component)
- Use `useAuthContext()` for auth state — never read `localStorage` directly
- Use Tailwind utilities — no custom CSS unless absolutely necessary
- Validate user input at system boundaries using `lib/validation.ts`
- Use `Alert` component or `sonner` toast for user-facing errors
- Use narrow component props — pass only what's needed
- Props down, callbacks up — if prop drilling exceeds 2 levels, extract to context
- Push `"use client"` as far down the component tree as possible

### Don't

- Put data-fetching logic directly in `page.tsx` files
- Use `any` — use proper type narrowing. Never cast API responses to `any` — use the generic types from `lib/api.ts`
- Use `as unknown as X` double-casts — fix the API namespace return type instead
- Create wrapper components that just pass props through
- Add abstractions until the third use (YAGNI)
- Modify shared UI components for page-specific needs — extend via props or compose
- Mutate props or reach upward in the component tree
- Use uncontrolled form inputs unless performance requires it
- Duplicate utility functions — check `@/lib/utils` first (`formatTimeAgo`, `formatDate`, `truncateAddress`, `formatSalaryRange`, `formatDeadline`)
- Write manual `useState(isLoading) + useEffect + try/catch` — always use `useFetch`/`useApi` hooks
- Write manual auth guards — use `useRequireAuth` hook from `@/lib/hooks/useRequireAuth`
- Write manual pagination math — use `useClientPagination` from `@/lib/hooks/useClientPagination`
- Write manual debounce logic — use `useDebounce` from `@/lib/hooks/useDebounce`
- Catch errors with only `console.error` — always show user feedback via `Alert` or `toast`
- Extract errors manually from ApiError — use `extractApiError(error, "fallback")` from `lib/api.ts`
- Cast errors with `as { response?: ... }` — use `error instanceof ApiError` if you must check type
- Duplicate status-code handling (401, 403, etc.) — `extractApiError()` already provides human-readable messages
- Use `console.error`/`console.warn` in catch blocks — use `logger` from `lib/logger.ts` + show user feedback
- Catch errors silently for user-facing operations — always provide feedback
- Define inline types that exist in `@/types` — use `Pick<>` if you need a subset
- Build custom modal overlays — use `Modal` from `@/components/ui/modal`
- Define local `statusConfig` objects — use the shared config from `@/config/constants`
- Write inline empty states — use `EmptyState` from `@/components/ui/empty-state`
- Manually handle 401 in components — `apiRequest` handles token refresh automatically
- Use `useEffect` directly — use `useMountEffect` for mount effects, `useFetch` for data, inline computation for derived state, event handlers for actions
- Write `useEffect(() => setX(deriveFromY(y)), [y])` — compute inline or use `useMemo`
- Write click-outside effects — use `useClickOutside` from `@/lib/hooks/useClickOutside`
- Suppress `react-hooks/exhaustive-deps` with eslint-disable — fix the dependencies

### Color System

All colors MUST come from the centralized token system. Never hardcode Tailwind color names (e.g., `text-green-500`, `bg-blue-100`) in components.

**Imports:**
- `import { STATUS_COLORS, RANK_COLORS, VOTE_COLORS, STAT_ICON } from "@/config/colors"`
- Status configs: `APPLICATION_STATUS_CONFIG`, `JOB_STATUS_CONFIG`, etc. from `@/config/constants`

**Semantic status:** Use `STATUS_COLORS.positive`, `.negative`, `.warning`, `.info`, `.neutral`, `.pending` — never raw Tailwind colors for status indicators.

**Rank colors:** Use `getRankColors(rank)` from `@/config/colors` — never define rank colors inline.

**Stat icons:** Use `STAT_ICON.bg` and `STAT_ICON.text` — all stat icons are brand orange, not per-metric rainbow.

**Notifications:** Use `getNotificationPriority()` → `NOTIFICATION_COLORS[priority]` — 3 tiers (urgent/action/positive), not per-type rainbow.

**Match scores:** Use `getMatchScoreColors(pct)` — returns positive/warning/negative.

**Vote colors:** Use `VOTE_COLORS.for`, `.against`, `.abstain`.

**Exceptions:** Brand logos (MetaMask, Coinbase, LinkedIn) may use hardcoded hex colors.

### Don't (Color-Specific)

- Hardcode Tailwind color names (`text-green-500`, `bg-blue-100`, etc.) — use `STATUS_COLORS` / `RANK_COLORS` from `@/config/colors`
- Define local status color mappings — use shared configs from `@/config/constants`
- Use different colors for the same rank on different pages — use `getRankColors()` everywhere
- Assign different icon colors per metric — use `STAT_ICON` for all stat icons
- Use `bg-white/[0.0X]` for dark mode surfaces — use `bg-surface-*` tokens or `bg-muted`

## Common Tasks

### Adding a New Page

1. Create `src/app/{route}/page.tsx` as a thin shell
2. Create the actual component in `src/components/`
3. Add `"use client"` only if the component needs interactivity
4. Use types from `@/types`, API calls via `lib/api.ts`

### Adding a New API Call

Add to the appropriate namespace in `lib/api.ts`. The client handles:
- Auth token injection (for `requiresAuth` requests)
- Automatic 401 → token refresh → retry
- Response envelope unwrapping (`{ success, data }`)
- `FormData` support
- Error sanitization (XSS prevention)

### Wallet Integration

```typescript
import { useAccount, useConnect, useDisconnect } from "wagmi";
const { address, isConnected } = useAccount();
```

WalletConnect is disabled — only MetaMask and Coinbase Wallet are supported.
