export interface SearchIndexEntry {
  title: string;
  description: string;
  href: string;
  persona: "experts" | "candidates" | "companies" | "shared";
  headings: string[];
  keywords: string[];
}

/**
 * Search index for all 25 docs pages.
 * Headings, descriptions, and keywords are manually curated for search quality.
 */
export const searchIndex: SearchIndexEntry[] = [
  // ── Shared ──
  {
    title: "Vetted Documentation",
    description:
      "Learn how Vetted works — guild-backed candidate vetting, commit-reveal voting, on-chain reputation.",
    href: "/docs",
    persona: "shared",
    headings: ["Pick your path", "Popular topics", "New to Vetted?"],
    keywords: [
      "home",
      "landing",
      "overview",
      "getting started",
      "guilds",
      "decentralized hiring",
    ],
  },
  {
    title: "What is Vetted?",
    description:
      "Vetted is a decentralized hiring platform where domain-expert guilds vet candidates through commit-reveal voting, with reputation staked on-chain.",
    href: "/docs/what-is-vetted",
    persona: "shared",
    headings: [
      "The problem",
      "The Vetted model",
      "Three actors",
      "Why on-chain",
      "What it's not",
    ],
    keywords: [
      "platform",
      "decentralized",
      "hiring",
      "expert guilds",
      "staked reputation",
      "tamper-evidence",
    ],
  },
  {
    title: "How Vetted works",
    description:
      "Walk through the full Vetted lifecycle: a candidate applies, a guild reviews them blind, consensus is calculated, and a company hires.",
    href: "/docs/how-it-works",
    persona: "shared",
    headings: [
      "The three lanes",
      "End to end",
      "Candidate lane",
      "Expert lane",
      "Company lane",
      "What moves on-chain",
    ],
    keywords: [
      "lifecycle",
      "pipeline",
      "blind review",
      "IQR consensus",
      "on-chain",
      "swimlane",
      "interquartile range",
    ],
  },
  {
    title: "Quickstart",
    description:
      "Pick the quickstart that matches what you're trying to do — vet candidates, land a job, or hire.",
    href: "/docs/quickstart",
    persona: "shared",
    headings: [],
    keywords: [
      "get started",
      "first time",
      "onboarding",
      "10 minutes",
      "choose path",
    ],
  },
  {
    title: "Glossary",
    description:
      "Every Vetted-specific term in one place — commit-reveal voting, slashing, IQR consensus, guild ranks, and more.",
    href: "/docs/glossary",
    persona: "shared",
    headings: [
      "Core concepts",
      "Voting mechanics",
      "Reputation and stakes",
      "Web3 basics",
    ],
    keywords: [
      "definitions",
      "terms",
      "IQR",
      "nonce",
      "hash",
      "VETD",
      "gas",
      "wallet",
      "slashing",
      "guild",
      "rubric",
      "alignment tier",
      "commit phase",
      "reveal phase",
      "cycle",
      "signature",
      "stake",
      "unstake cooldown",
    ],
  },
  {
    title: "Frequently asked questions",
    description:
      "Frequently asked questions about Vetted — wallets, accounts, voting, reputation, slashing, and more.",
    href: "/docs/faq",
    persona: "shared",
    headings: [
      "General",
      "Accounts and wallets",
      "Guilds and voting",
      "Reputation and tokens",
      "Trust and safety",
    ],
    keywords: [
      "FAQ",
      "free",
      "blockchain",
      "wallet types",
      "conflict of interest",
      "inactivity decay",
      "data deletion",
      "privacy",
    ],
  },

  // ── Experts ──
  {
    title: "For experts",
    description:
      "Complete guide for Vetted experts — apply to a guild, review candidates, vote under commit-reveal, earn reputation, and participate in governance.",
    href: "/docs/experts",
    persona: "experts",
    headings: [
      "Start here",
      "Core workflows",
      "Economics",
      "Advanced",
    ],
    keywords: [
      "expert handbook",
      "guild application",
      "reputation earning",
      "voting protocol",
      "staked accountability",
    ],
  },
  {
    title: "Expert quickstart",
    description:
      "Connect your wallet, apply to a guild, and cast your first vote — in about 10 minutes.",
    href: "/docs/experts/quickstart",
    persona: "experts",
    headings: [
      "Before you start",
      "The five steps",
      "What just happened",
    ],
    keywords: [
      "wallet connection",
      "MetaMask",
      "Coinbase Wallet",
      "guild application",
      "first vote",
      "nonce",
      "testnet",
      "gasless signup",
      "no-AI declaration",
    ],
  },
  {
    title: "Applying to a guild",
    description:
      "Walkthrough of the four-step guild application — personal info, background, answers, and wallet-signed review.",
    href: "/docs/experts/applying-to-a-guild",
    persona: "experts",
    headings: [
      "Overview",
      "Personal information",
      "Professional background",
      "Application questions",
      "Review and sign",
      "After submit",
      "Picking a guild",
    ],
    keywords: [
      "application form",
      "four steps",
      "local storage",
      "wallet signing",
      "guild selection",
      "auto-save",
    ],
  },
  {
    title: "Reviewing candidates",
    description:
      "How to read a candidate application, score against the rubric, and write comments that help your fellow experts.",
    href: "/docs/experts/reviewing-candidates",
    persona: "experts",
    headings: [
      "The review page",
      "The rubric",
      "Writing comments",
      "Common mistakes",
      "Conflicts",
    ],
    keywords: [
      "rubric scoring",
      "15-20 minutes",
      "evidence-based comments",
      "anchoring bias",
      "conflict of interest",
      "abstention",
    ],
  },
  {
    title: "Commit-reveal voting",
    description:
      "The two-phase voting protocol Vetted uses to prevent anchoring and herding — with an interactive demo.",
    href: "/docs/experts/commit-reveal-voting",
    persona: "experts",
    headings: [
      "Why commit-reveal",
      "The protocol",
      "Try it",
      "Consensus math",
      "Alignment tiers",
      "Recovering commits",
    ],
    keywords: [
      "two-phase",
      "blind voting",
      "hash commitment",
      "nonce",
      "IQR filtering",
      "anchoring prevention",
      "herding prevention",
      "interactive demo",
      "alignment tiers",
      "pseudocode",
    ],
  },
  {
    title: "Reputation & ranks",
    description:
      "How reputation is earned, lost, and mapped to the five guild rank tiers and their reward multipliers.",
    href: "/docs/experts/reputation-and-ranks",
    persona: "experts",
    headings: [
      "What is reputation",
      "How it's earned",
      "How it's lost",
      "Rank tiers",
      "Multipliers",
      "Per guild",
      "Timeline",
    ],
    keywords: [
      "per-guild tracking",
      "aligned votes",
      "endorsement success",
      "inactivity decay",
      "five rank tiers",
      "Recruit",
      "Apprentice",
      "Craftsman",
      "Officer",
      "Master",
      "reward multipliers",
    ],
  },
  {
    title: "Endorsements",
    description:
      "Stake VETD on candidates you believe in. Endorsements are public, higher-risk bets separate from commit-reveal votes.",
    href: "/docs/experts/endorsements",
    persona: "experts",
    headings: [
      "What they are",
      "Endorsements vs voting",
      "How to endorse",
      "Outcome math",
      "Strategy",
    ],
    keywords: [
      "staked conviction",
      "public financial bet",
      "high risk high reward",
      "endorsement reward pool",
      "conviction sizing",
      "VETD",
    ],
  },
  {
    title: "Slashing & accountability",
    description:
      "The IQR-based math behind slashing, the four tiers, and how to appeal a slashing decision.",
    href: "/docs/experts/slashing-and-accountability",
    persona: "experts",
    headings: [
      "What slashing is",
      "What triggers it",
      "The math",
      "The tiers",
      "Worked example",
      "Appeals",
      "Protection",
    ],
    keywords: [
      "slashing penalty",
      "deterministic",
      "IQR-based filtering",
      "four alignment tiers",
      "stake forfeiture",
      "appeal process",
      "guild governance",
    ],
  },
  {
    title: "Earnings & withdrawals",
    description:
      "The three expert earning streams, how to claim rewards, and the seven-day unstake cooldown.",
    href: "/docs/experts/earnings-and-withdrawals",
    persona: "experts",
    headings: [
      "Three streams",
      "Voting rewards",
      "Endorsement payouts",
      "Governance rewards",
      "Claiming",
      "Unstaking",
      "Taxes",
    ],
    keywords: [
      "earning streams",
      "voting rewards",
      "endorsement payouts",
      "governance rewards",
      "7-day cooldown",
      "partial unstakes",
      "tax documentation",
      "claim",
      "withdraw",
    ],
  },
  {
    title: "Governance & proposals",
    description:
      "Shape the protocol — create proposals, vote on parameter changes, and understand how vote weight is computed from reputation.",
    href: "/docs/experts/governance",
    persona: "experts",
    headings: [
      "What governance is",
      "Proposal types",
      "Vote weight",
      "Creating proposals",
      "Voting on proposals",
      "Quorum",
      "Etiquette",
    ],
    keywords: [
      "guild-level governance",
      "protocol-level governance",
      "vote weighting",
      "parameter changes",
      "rubric changes",
      "enforcement actions",
      "quorum",
      "immutable votes",
    ],
  },
  {
    title: "Expert FAQ",
    description:
      "Questions experts ask most often — deadlines, wallets, earnings, appeals, taxes.",
    href: "/docs/experts/faq",
    persona: "experts",
    headings: [
      "Wallets",
      "Voting operations",
      "Rewards and claims",
      "Slashing and appeals",
      "Career",
    ],
    keywords: [
      "separate wallets",
      "reputation portability",
      "hash mismatch",
      "missed deadlines",
      "voting reward settlements",
      "appeal process",
      "Master rank",
    ],
  },

  // ── Candidates ──
  {
    title: "For candidates",
    description:
      "Guide for candidates on Vetted — build your profile, get expert endorsements, and apply to jobs backed by on-chain reputation.",
    href: "/docs/candidates",
    persona: "candidates",
    headings: [],
    keywords: [
      "candidate guide",
      "email signup",
      "no wallet required",
      "5-stage pipeline",
      "expert endorsements",
      "guild-vetted shortlist",
    ],
  },
  {
    title: "Candidate quickstart",
    description:
      "Sign up, build a profile, and apply to your first job in under ten minutes.",
    href: "/docs/candidates/quickstart",
    persona: "candidates",
    headings: [
      "Before you start",
      "The five steps",
      "The vetting pipeline",
    ],
    keywords: [
      "email signup",
      "LinkedIn OAuth",
      "profile completion",
      "job browsing",
      "match scores",
      "screening questions",
      "2-5 days review",
    ],
  },
  {
    title: "Building your profile",
    description:
      "What fields matter most to guild reviewers and how to present your work in ways they actually read.",
    href: "/docs/candidates/profile",
    persona: "candidates",
    headings: [
      "How reviewers read",
      "The headline",
      "Work history",
      "Links",
      "Application answers",
      "Common pitfalls",
    ],
    keywords: [
      "profile optimization",
      "headline",
      "first 60 seconds",
      "quantified outcomes",
      "GitHub portfolio",
      "dead links",
      "evidence over adjectives",
    ],
  },
  {
    title: "Endorsements & reputation",
    description:
      "How expert endorsements affect candidate hiring outcomes — and why they're different from recommendations on other platforms.",
    href: "/docs/candidates/endorsements",
    persona: "candidates",
    headings: [
      "What they are",
      "Why they matter",
      "How to earn endorsements",
      "Endorsements vs recommendations",
      "What if",
    ],
    keywords: [
      "expert staking",
      "LinkedIn recommendations comparison",
      "consensus score",
      "low base rate",
      "portfolio quality",
    ],
  },

  // ── Companies ──
  {
    title: "For companies",
    description:
      "Guide for hiring teams using Vetted — post jobs, receive guild-vetted shortlists, and hire with confidence.",
    href: "/docs/companies",
    persona: "companies",
    headings: [],
    keywords: [
      "hiring team guide",
      "email signup",
      "guild-vetted shortlists",
      "48-hour review",
      "no crypto required",
    ],
  },
  {
    title: "Company quickstart",
    description:
      "Create a company account, post your first job, and receive a guild-vetted shortlist.",
    href: "/docs/companies/quickstart",
    persona: "companies",
    headings: [
      "What you'll end up with",
      "Before you start",
      "The five steps",
      "What next",
    ],
    keywords: [
      "30 minutes",
      "company profile",
      "job posting",
      "guild selection",
      "screening questions",
      "candidate pipeline",
      "match scores",
    ],
  },
  {
    title: "Guild-backed vetting",
    description:
      "The full vetting flow from the hiring team's perspective — what questions to ask, what the scores mean, and how to interpret expert feedback.",
    href: "/docs/companies/guild-vetting",
    persona: "companies",
    headings: [
      "The principle",
      "Screening questions",
      "What the score means",
      "Reading endorsements",
      "The shortlist",
      "Feedback loop",
    ],
    keywords: [
      "structured expert evaluation",
      "screening question design",
      "0-100 consensus score",
      "score bands",
      "endorsement signals",
      "feedback aggregation",
    ],
  },
  {
    title: "Why Web3 for hiring",
    description:
      "The trust argument for using an on-chain vetting protocol instead of a traditional applicant tracking system.",
    href: "/docs/companies/why-web3",
    persona: "companies",
    headings: [
      "The fair objection",
      "Three things the chain gives you",
      "Tamper-evidence",
      "Accountability",
      "Portability",
      "What we don't claim",
      "What you touch",
    ],
    keywords: [
      "tamper-evidence",
      "commit-reveal hashes",
      "staked accountability",
      "portable reputation",
      "no decentralization theatre",
      "standard web app",
      "ATS comparison",
    ],
  },
];
