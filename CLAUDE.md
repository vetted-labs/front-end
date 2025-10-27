# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vetted** is a decentralized hiring platform built on Next.js 15 (App Router) that connects companies with Web3 talent through a guild-based review system. The platform integrates Web3 wallet authentication using RainbowKit, Wagmi, and WalletConnect for decentralized identity management.

## Development Commands

### Running the Application
```bash
npm run dev        # Start development server with Turbopack (http://localhost:3000)
npm run build      # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

### Backend Dependency
The application expects a backend API running at `http://localhost:4000` for job management and dashboard statistics. Without this backend, the hiring dashboard and job CRUD operations will fail.

## Architecture

### Web3 Integration Layer
The application uses a multi-provider Web3 architecture:

- **wagmi-config.ts**: Configures blockchain connections (Ethereum Mainnet, Sepolia, Polygon, Arbitrum) and wallet connectors (MetaMask, Coinbase Wallet, WalletConnect)
- **src/components/providers.tsx**: Wraps the app with `WagmiProvider`, `QueryClientProvider` (TanStack Query), and `RainbowKitProvider`
- Requires `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` environment variable for WalletConnect functionality

### Application Flow
1. **Landing** (`/` → `homepage.tsx`): Marketing page with wallet connection modal
2. **Company Onboarding** (`/company` → `CompanyForm.tsx`): Registration form (currently mock - navigates to dashboard after 1s delay)
3. **Dashboard** (`/dashboard` → `HiringDashboard.tsx`): Main hub showing job postings, stats, and management actions
4. **Job Management**:
   - Create: `/jobs/new` → `JobForm.tsx`
   - Edit: `/jobs/[jobId]/edit` → `JobForm.tsx` (with jobId param)
   - View: `/jobs/[jobId]` → `JobDetails.tsx`

### Component Patterns
- All interactive components use `"use client"` directive (Client Components)
- Forms use local state management with controlled inputs
- API calls to backend use standard `fetch` with error handling
- Loading states managed with `isLoading` boolean and Lucide `Loader2` icon
- Path aliases: `@/` maps to `./src/`

### Data Models
**JobPosting Interface** (from `HiringDashboard.tsx`):
```typescript
{
  id: string
  title: string
  department: string | null
  location: string
  type: "Full-time" | "Part-time" | "Contract" | "Freelance"
  salary: { min: number | null; max: number | null; currency: string }
  status: "draft" | "active" | "paused" | "closed"
  applicants: number
  views: number
  createdAt: string
  updatedAt: string
  description: string
  requirements: string[]
  guild: string  // Guild-based review system identifier
  companyId: string
}
```

### Backend API Endpoints Expected
- `GET /api/jobs?status={status}&search={query}` - Fetch filtered jobs
- `GET /api/dashboard/stats` - Fetch dashboard statistics
- `POST /api/jobs` - Create job posting
- `PUT /api/jobs/{jobId}` - Update job posting
- `GET /api/jobs/{jobId}` - Fetch single job
- `DELETE /api/jobs/{jobId}` - Delete job posting

### Styling
- **TailwindCSS 4** with PostCSS integration
- Design system: Violet/Indigo gradients, slate color scheme
- Typography: Inter font via `next/font/google`
- Icons: Lucide React
- No component library - custom components with utility-first CSS

## Key Technical Decisions

### Next.js Configuration
- Uses **Turbopack** for faster development builds and production compilation
- App Router with file-based routing under `src/app/`
- TypeScript strict mode enabled
- Target: ES2017 with modern ESNext modules

### State Management
- Local component state with `useState` (no global state library)
- TanStack Query integrated for caching (via RainbowKit setup) but not actively used for data fetching yet
- Wagmi hooks (`useAccount`, `useConnect`, `useDisconnect`) for wallet state

### Authentication Pattern
The CompanyForm currently bypasses actual authentication - it simulates a 1-second delay and navigates to the dashboard without API calls. Real authentication needs to be implemented to persist company sessions.

## Common Development Patterns

### Adding a New Page
1. Create route file in `src/app/{route}/page.tsx`
2. Import/create component from `src/components/`
3. Use `"use client"` if component needs interactivity
4. Use `useRouter` from `next/navigation` for programmatic navigation

### Making API Calls
Always include error handling and loading states:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch('http://localhost:4000/api/endpoint');
    if (!response.ok) throw new Error(`${response.status} - ${response.statusText}`);
    const data = await response.json();
    // Handle data
  } catch (error) {
    setError((error as Error).message);
  } finally {
    setIsLoading(false);
  }
};
```

### Wallet Integration
Access wallet state via Wagmi hooks:
```typescript
const { address, isConnected } = useAccount();
const { connectors, connect } = useConnect();
const { disconnect } = useDisconnect();
```

## Important Notes

- Backend must be running on port 4000 for full functionality
- WalletConnect requires a valid project ID from WalletConnect Cloud
- The "guild" concept is central to the platform's trust model - reviewers stake their judgment
- Job status workflow: draft → active → paused/closed
- All monetary values stored in smallest currency unit (e.g., cents/wei)
