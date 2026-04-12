/**
 * Single source of truth for in-app → docs deep links.
 *
 * Never hardcode a `/docs/...` URL in a feature component — import from here
 * so link renames propagate automatically and every contextual-help surface
 * stays in sync.
 */
export const DOC_LINKS = {
  // Shared
  overview: "/docs",
  howItWorks: "/docs/how-it-works",
  whatIsVetted: "/docs/what-is-vetted",
  glossary: "/docs/glossary",
  faq: "/docs/faq",

  // Expert
  expertOverview: "/docs/experts",
  expertQuickstart: "/docs/experts/quickstart",
  applyingToGuild: "/docs/experts/applying-to-a-guild",
  reviewingCandidates: "/docs/experts/reviewing-candidates",
  commitReveal: "/docs/experts/commit-reveal-voting",
  reputation: "/docs/experts/reputation-and-ranks",
  endorsements: "/docs/experts/endorsements",
  slashing: "/docs/experts/slashing-and-accountability",
  earnings: "/docs/experts/earnings-and-withdrawals",
  governance: "/docs/experts/governance",
  expertFaq: "/docs/experts/faq",

  // Company
  companyOverview: "/docs/companies",
  companyQuickstart: "/docs/companies/quickstart",
  guildVetting: "/docs/companies/guild-vetting",
  whyWeb3: "/docs/companies/why-web3",

  // Candidate
  candidateOverview: "/docs/candidates",
  candidateQuickstart: "/docs/candidates/quickstart",
  candidateProfile: "/docs/candidates/profile",
  candidateEndorsements: "/docs/candidates/endorsements",
} as const;

export type DocLinkKey = keyof typeof DOC_LINKS;
