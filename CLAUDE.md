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

## Code Quality Rules

### Do

- Use `apiRequest()` or domain API namespaces — never raw `fetch`
- Use `useFetch`/`useApi` hooks for data fetching in components
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
- Define inline types that exist in `@/types` — use `Pick<>` if you need a subset
- Build custom modal overlays — use `Modal` from `@/components/ui/modal`
- Define local `statusConfig` objects — use the shared config from `@/config/constants`
- Write inline empty states — use `EmptyState` from `@/components/ui/empty-state`
- Manually handle 401 in components — `apiRequest` handles token refresh automatically

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
