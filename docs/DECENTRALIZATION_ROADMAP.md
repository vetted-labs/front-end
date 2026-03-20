# Vetted Decentralization Roadmap

A progressive path from the current hybrid architecture toward a fully decentralized hiring protocol. Each phase builds on the previous one, and the boundaries between phases are fluid — some items can be pulled forward or pushed back depending on priorities, gas economics, and user adoption.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Phase 1: Verifiable Outputs](#2-phase-1-verifiable-outputs)
3. [Phase 2: Candidate Ownership](#3-phase-2-candidate-ownership)
4. [Phase 3: Decentralized Operations](#4-phase-3-decentralized-operations)
5. [Phase 4: Full Decentralization](#5-phase-4-full-decentralization)
6. [Technical Considerations](#6-technical-considerations)
7. [What Should Stay Off-Chain](#7-what-should-stay-off-chain)
8. [Smart Contract Architecture](#8-smart-contract-architecture)

---

## 1. Current State

### What's On-Chain Today (Sepolia)

Eight deployed contracts handle the expert incentive layer:

| Contract | What It Does |
|----------|-------------|
| **VettedToken (VETD)** | ERC-20 with EIP-2612 permit — the protocol's unit of account |
| **ExpertStaking** | Per-guild stake lockups with cooldown periods |
| **EndorsementBidding** | Schelling-point marketplace where experts bid VETD on candidates |
| **VettingManager** | Commit-reveal voting for guild membership applications |
| **ReputationManager** | On-chain reputation scores with decay |
| **RewardDistributor** | Claim rewards earned from successful endorsements |
| **SlashingManager** | Stake slashing + appeal/arbitration system |
| **GuildRegistry** | Guild membership tracking |

All contracts use EIP-2612 permit for single-transaction flows (no separate `approve()` step).

### What's Off-Chain Today

| Data | Where It Lives |
|------|---------------|
| **User accounts** | Backend DB — candidates/companies use JWT, experts use wallet-only SIWE auth |
| **Job postings** | Backend DB — full job details, requirements, salary, metadata |
| **Candidate profiles** | Backend DB — resumes, skills, work history, preferences |
| **Company profiles** | Backend DB — company details, team members, billing |
| **Applications** | Backend DB — candidate-to-job applications, status tracking |
| **Expert reviews/votes** | Backend DB — rubric scores, written reviews, reasoning (only commit hashes go on-chain) |
| **Guild metadata** | Backend DB — descriptions, rules, activity feeds, leaderboards |
| **Governance proposals** | Backend DB — proposal text, discussion, vote history (tallies may go on-chain) |
| **Messaging** | Backend DB — DMs, meeting scheduling |
| **Notifications** | Backend DB — all expert/candidate/company notifications |
| **Endorsement metadata** | Backend DB — application details, job context (only bid amounts are on-chain) |

### The Bridge Pattern

The current architecture uses a **two-phase sync** model:
1. **Write on-chain** — Wagmi sends the transaction
2. **Sync to backend** — After TX confirmation, `blockchainApi.sync*()` mirrors state to the DB for fast queries

This is pragmatic but creates a trust assumption: the backend is the source of truth for most data, and on-chain state is only authoritative for the incentive layer.

---

## 2. Phase 1: Verifiable Outputs

**Goal:** Make off-chain outcomes independently verifiable without moving all data on-chain. Anyone should be able to prove what happened — even if the backend disappeared.

### 2.1 Credential Attestations

When a candidate is vetted (endorsed by experts, hired by a company), publish an **on-chain attestation** that proves the outcome.

- **What:** A hash commitment like `keccak256(candidateId, guildId, role, outcome, timestamp)` stored in an attestation contract
- **Why:** Candidates can prove "I was vetted by Guild X for Role Y" without revealing PII
- **How:** New `CredentialRegistry` contract — the backend calls `attest()` after a hiring event is confirmed
- **Bonus:** Compatible with EAS (Ethereum Attestation Service) schema for interoperability

### 2.2 Hiring Outcome Proofs

When a company confirms a hire through the platform, anchor that outcome on-chain:

- Hash of `(jobId, candidateId, hireDate, endorsingExperts[])` published to an `OutcomeRegistry`
- Enables trustless reward/slash calculations — anyone can verify that a hire happened
- Removes the need to trust the backend's `finalizeJob()` call

### 2.3 Application Hash Commitments

Before expert review begins, hash the candidate's full application and store it on-chain:

- `keccak256(applicationData)` → `ApplicationRegistry.commit(appHash)`
- Proves the application wasn't tampered with between submission and review
- The raw data stays off-chain (IPFS or backend), but the hash is the anchor

### 2.4 Review Integrity Proofs

Currently, only the commit hash of a vote goes on-chain. Extend this:

- After reveal, publish `keccak256(fullReviewText, rubricScores, expertAddress)` alongside the vote
- Anyone can later verify a review wasn't edited post-hoc
- The full review text stays off-chain, but integrity is provable

### What This Unlocks

- **Portable proof of vetting** — candidates carry evidence across platforms
- **Auditability** — any party can verify hiring outcomes and review integrity
- **Reduced trust in backend** — on-chain hashes serve as commitments even if the DB is compromised
- **Foundation for Phase 2** — credentials need to be verifiable before they can be portable

---

## 3. Phase 2: Candidate Ownership

**Goal:** Candidates own their credentials and professional identity, independent of the Vetted platform.

### 3.1 Candidate Wallets

Candidates connect wallets (like experts already do):

- SIWE authentication replaces or augments JWT for candidates
- Wallet address becomes the canonical identity anchor
- Backward-compatible: existing email accounts can link wallets progressively

### 3.2 Soulbound Tokens (SBTs) for Vetted Status

When a candidate passes vetting, mint a non-transferable SBT:

- `VettedCredential` SBT — contains guild, role category, skill attestations, vetting date
- Non-transferable (you can't sell your reputation)
- Revocable by governance (if fraud is discovered)
- Composable: other protocols can check `balanceOf(candidate, credentialType)` to gate access

### 3.3 Portable Credential Schema

Define a standard schema for Vetted credentials that works across platforms:

```
{
  holder: address,
  guild: "Smart Contract Security",
  role: "Auditor",
  vettedBy: [expert1, expert2, expert3],
  consensusScore: 85,
  issuedAt: timestamp,
  attestationHash: bytes32
}
```

- Compatible with W3C Verifiable Credentials or EAS schemas
- Other hiring platforms can verify credentials without calling the Vetted API
- Candidates can present credentials anywhere — LinkedIn, other DAOs, protocols

### 3.4 Self-Sovereign Profile Data

Move candidate profile data to candidate-controlled storage:

- Profile metadata → IPFS (pinned by candidate, referenced on-chain by CID)
- Resume/CV → encrypted on IPFS, decryption key shared selectively via Lit Protocol or similar
- Skill endorsements → on-chain attestations from experts
- The backend becomes an indexer, not the source of truth

### What This Unlocks

- **Platform independence** — candidates aren't locked into Vetted
- **Privacy control** — candidates choose who sees what
- **Composability** — other protocols can build on Vetted credentials
- **Network effects** — credentials become more valuable as more platforms recognize them

---

## 4. Phase 3: Decentralized Operations

**Goal:** Move governance and operational decisions on-chain. The protocol runs itself, with the backend as an optional convenience layer.

### 4.1 On-Chain Governance

Move governance proposals fully on-chain:

- `GovernanceContract` with proposal creation, voting, and execution
- Proposal types: parameter changes (minimum stake, cooldown periods, slash percentages), treasury allocation, protocol upgrades
- Time-locked execution (e.g., 48h delay after vote passes)
- Vote weight based on reputation score × stake amount
- Quorum requirements per proposal type

Currently: governance proposals live in the backend DB with off-chain voting. The transition is to make the on-chain contract the canonical source, with the backend indexing events for UI.

### 4.2 Decentralized Guild Creation

Today, guilds are created via backend admin actions. Decentralize this:

- Any expert with sufficient reputation can propose a new guild
- Guild creation requires staking a bond (e.g., 1000 VETD)
- Existing guild masters vote on whether to approve
- If approved, `GuildRegistry.createGuild()` is called by the governance contract
- Bond returned after guild reaches minimum membership threshold

### 4.3 On-Chain Dispute Resolution

Extend the existing `SlashingManager` appeal system into a full dispute resolution framework:

- **Dispute categories:** endorsement accuracy, review quality, guild rule violations, credential fraud
- **Arbitration panels:** randomly selected from high-reputation experts in adjacent guilds
- **Evidence submission:** hashes on-chain, raw evidence on IPFS
- **Escalation path:** panel → full guild vote → cross-guild arbitration → protocol governance
- **Stake-weighted voting** — arbitrators put skin in the game

### 4.4 Automated Reward/Slash Execution

Remove backend dependency from the reward/slash cycle:

- Chainlink Automation (or similar keeper) triggers `finalizeJob()` when hiring deadline passes
- Reward distribution calculated on-chain based on Schelling-point outcomes
- Slashing executed automatically when dispute resolution concludes
- No backend calls needed — everything runs from contract events + keepers

### 4.5 On-Chain Guild Feeds

Replace the backend-managed guild activity feed:

- Guild announcements → on-chain events (low-cost on L2)
- Important votes and outcomes → contract events
- The backend indexes events for fast rendering, but the data is independently reconstructible from the chain

### What This Unlocks

- **Credible neutrality** — no admin can unilaterally change protocol parameters
- **Censorship resistance** — guilds and governance can't be silenced
- **Trustless operations** — automated execution removes backend as a single point of failure
- **Composability** — other protocols can plug into Vetted governance

---

## 5. Phase 4: Full Decentralization

**Goal:** The Vetted protocol operates as a DAO with minimal reliance on any single team or backend.

### 5.1 DAO Governance Structure

- **VETD token** becomes the governance token (or a separate governance token is introduced)
- **Delegation** — token holders can delegate voting power to experts or representatives
- **Multi-sig treasury** → on-chain DAO treasury with proposal-based spending
- **Protocol upgrades** via UUPS proxy pattern, governed by DAO vote + timelock
- **Emergency multisig** for critical security responses (with strict constraints)

### 5.2 Protocol-Owned Contracts

All contracts become owned by the DAO, not an EOA:

- Ownership transferred to a `TimelockController` governed by the DAO
- Parameter changes require governance vote + execution delay
- Contract upgrades require supermajority + extended timelock
- No single key can pause, upgrade, or drain the protocol

### 5.3 Decentralized Frontend

- Frontend hosted on IPFS/Arweave with ENS domain
- Multiple frontend deployments possible (anyone can run one)
- Backend becomes an optional indexer — all critical state is on-chain
- Alternative: Farcaster Frames or similar for lightweight decentralized UIs

### 5.4 Minimal Backend Dependency

What the backend does in this phase:

- **Indexer only** — reads chain events, builds query-friendly databases
- **Push notifications** — optional convenience service
- **Search/filtering** — full-text search over on-chain + IPFS data
- **No write authority** — cannot change any protocol state

### 5.5 Cross-Protocol Composability

- **Vetted credentials accepted by other DAOs** — gated access based on SBTs
- **Integration with DeFi** — reputation-weighted borrowing, staking in external protocols
- **Job board aggregation** — multiple platforms can list jobs that use Vetted's expert review system
- **Expert reputation as a primitive** — other protocols consume reputation scores for their own governance

### What This Unlocks

- **True decentralization** — no single team controls the protocol
- **Sustainability** — protocol runs on economic incentives, not a company's runway
- **Permissionless innovation** — anyone can build on top of Vetted
- **Resilience** — no single point of failure, no single entity to regulate or shut down

---

## 6. Technical Considerations

### Gas Costs & L2 Strategy

The current deployment is on Sepolia (testnet). Production should target an L2:

| Option | Pros | Cons |
|--------|------|------|
| **Base** | Low gas, Coinbase ecosystem (already support CB Wallet), strong adoption | Centralized sequencer (for now) |
| **Arbitrum** | Mature, large ecosystem, decentralized | Higher gas than Base |
| **Optimism** | OP Stack, retroactive public goods funding | Smaller DeFi ecosystem |
| **zkSync** | Native account abstraction, cheap storage | Younger ecosystem, ZK-specific quirks |

**Recommendation:** Base or Arbitrum as primary L2, with the option to deploy on multiple L2s via a bridge or cross-chain messaging (Chainlink CCIP, LayerZero).

### Gas Optimization Patterns

- **Batch operations** — already present in contracts (`batchRevealVotes`, `batchUpdateGlobalReputation`, `batchSlashExperts`). Extend to all multi-user operations.
- **EIP-2612 permit** — already used. Keeps single-TX UX for all token-spending operations.
- **Merkle proofs for airdrops/rewards** — instead of individual `distributeRewards()` calls, publish a Merkle root and let users claim.
- **Event-based storage** — store data as events (cheaper than storage slots) when it only needs to be read off-chain.
- **Compressed calldata** — for L2s, calldata is the main cost driver. Use tight encoding.

### Privacy: ZK Proofs for Credentials

Candidates shouldn't have to reveal everything to prove they're qualified:

- **ZK credential proofs** — "I was vetted by a Top-10 guild with a score above 80" without revealing which guild, which experts, or the exact score
- **Frameworks:** Semaphore (group membership proofs), zk-SNARKs via circom, or Noir
- **Use cases:**
  - Prove vetted status without revealing identity
  - Prove minimum reputation score without revealing exact score
  - Prove guild membership without revealing which guild
  - Prove hiring history without revealing employer names
- **Implementation:** ZK circuits compiled off-chain, proofs verified on-chain by a `CredentialVerifier` contract

### Storage: IPFS + On-Chain Anchoring

| Data Type | Storage | Anchor |
|-----------|---------|--------|
| Resumes/CVs | IPFS (encrypted) | CID hash on-chain |
| Review text | IPFS | Content hash on-chain |
| Guild rules/descriptions | IPFS | CID in GuildRegistry |
| Governance proposal text | IPFS | CID in GovernanceContract |
| Profile photos | IPFS | CID on-chain or ENS avatar |
| Application data | IPFS | Content hash in ApplicationRegistry |

**Pinning strategy:** Protocol-funded Pinata/Filebase cluster, with candidates able to pin their own data as backup. Consider Arweave for permanent storage of critical attestations.

### Indexing: The Graph / Custom Subgraphs

As more data moves on-chain, the backend transitions to an indexer:

- Deploy subgraphs for each contract
- Frontend queries The Graph directly (or a custom indexer)
- Backend becomes optional — only needed for push notifications, search, and caching
- Multiple indexers possible for redundancy

### Account Abstraction (ERC-4337)

Improve UX for non-crypto-native candidates and companies:

- **Smart contract wallets** — social recovery, session keys, gas sponsorship
- **Paymaster** — protocol pays gas for candidates (funded by protocol treasury)
- **Session keys** — candidates sign once, then interact without popups for a session
- **Bundlers** — batch multiple user operations into a single transaction

---

## 7. What Should Stay Off-Chain

Not everything should be on-chain. Some data is better off-chain for legal, practical, or UX reasons:

### Personally Identifiable Information (PII)

- **Real names, emails, phone numbers** — GDPR/CCPA require deletion rights, which is incompatible with immutable storage
- **Government IDs** — KYC data must be handled by compliant custodians
- **Physical addresses** — no reason to put these on-chain
- **Solution:** Store PII in traditional databases with proper encryption. On-chain, reference users only by wallet address. If identity verification is needed, use privacy-preserving proofs (ZK) rather than raw PII.

### Large Files

- **Resumes, portfolios, code samples** — too expensive for on-chain storage at any scale
- **Images, videos** — same
- **Solution:** IPFS/Arweave for storage, on-chain CID hashes for integrity

### High-Frequency / Low-Value Data

- **Real-time messaging** — DMs between candidates and companies don't need blockchain guarantees
- **Notification preferences** — user settings are not protocol-critical
- **Session data, analytics** — ephemeral and private
- **Activity feeds** — can be reconstructed from events but shouldn't be stored on-chain

### UX-Sensitive Flows

- **Search and filtering** — full-text search over jobs, candidates, guilds needs a proper database/search engine
- **Recommendation algorithms** — ML-based matching is a backend concern
- **Draft states** — half-completed job posts, unsent messages, form autosave
- **Rate limiting, spam prevention** — off-chain middleware is more responsive than on-chain checks

### Legal / Compliance

- **Dispute evidence documents** — may contain sensitive information, legal privilege
- **Payment processing** — fiat on/off ramps are inherently centralized (Stripe, etc.)
- **Content moderation** — some jurisdictions require ability to remove content

---

## 8. Smart Contract Architecture

### New Contracts by Phase

#### Phase 1 Contracts

```
CredentialRegistry
├── attest(holder, schema, data, attestationHash) → attestationId
├── revoke(attestationId, reason)
├── verify(attestationId) → bool
├── getAttestations(holder) → Attestation[]
└── Events: Attested, Revoked

OutcomeRegistry
├── recordHire(jobHash, candidateHash, endorserHashes[], timestamp)
├── getOutcome(jobHash, candidateHash) → HireOutcome
├── verifyOutcome(jobHash, candidateHash) → bool
└── Events: HireRecorded, OutcomeDisputed

ApplicationRegistry
├── commitApplication(applicationHash, guildId, timestamp)
├── verifyApplication(applicationHash) → bool
└── Events: ApplicationCommitted
```

#### Phase 2 Contracts

```
VettedCredentialSBT (ERC-5192 — non-transferable NFT)
├── mint(holder, guild, role, score, attestationId) → tokenId
├── revoke(tokenId, reason)
├── verify(tokenId) → CredentialData
├── tokensOf(holder) → tokenId[]
├── locked(tokenId) → true  // always locked, non-transferable
└── Events: CredentialIssued, CredentialRevoked

ProfileRegistry
├── setProfile(wallet, ipfsCid)
├── getProfile(wallet) → ipfsCid
├── setEncryptionKey(wallet, publicKey)  // for selective disclosure
└── Events: ProfileUpdated
```

#### Phase 3 Contracts

```
VettedGovernor (OpenZeppelin Governor pattern)
├── propose(targets[], values[], calldatas[], description)
├── castVote(proposalId, support)
├── castVoteWithReason(proposalId, support, reason)
├── execute(proposalId)
├── queue(proposalId)  // timelock
├── getVotes(account, blockNumber) → votingPower
└── Voting power = f(reputation, stake, delegation)

GuildFactory
├── proposeGuild(name, description, bond, initialMembers[])
├── approveGuild(proposalId) → guildId
├── dissolveGuild(guildId, reason)  // governance only
└── Events: GuildProposed, GuildCreated, GuildDissolved

DisputeResolution
├── fileDispute(category, evidenceHash, respondent, stake)
├── assignArbitrators(disputeId)  // VRF-based random selection
├── submitVerdict(disputeId, verdict, reasoning)
├── appeal(disputeId, newEvidenceHash)
├── escalate(disputeId)  // to next tier
├── executeVerdict(disputeId)
└── Events: DisputeFiled, ArbitratorsAssigned, VerdictReached, Appealed

AutomationKeeper (Chainlink-compatible)
├── checkUpkeep(checkData) → (upkeepNeeded, performData)
├── performUpkeep(performData)  // triggers finalizations, reward distributions, decay
└── Registered for: job finalization, reward distribution, reputation decay, session expiry
```

#### Phase 4 Contracts

```
VettedDAO
├── TimelockController (delay-based execution)
├── VettedGovernor (proposal + voting)
├── Treasury (protocol-owned funds)
└── ProxyAdmin (UUPS upgrade control)

Paymaster (ERC-4337)
├── validatePaymasterUserOp(userOp, maxCost) → context
├── postOp(context, actualCost)  // reimburse from treasury
└── Sponsored operations: credential claims, first-time interactions

CrossChainBridge (if multi-L2)
├── sendCredential(destChain, holder, credentialData)
├── receiveCredential(srcChain, holder, credentialData)
└── Uses: Chainlink CCIP or LayerZero
```

### Contract Dependency Graph

```
Phase 1:
  CredentialRegistry ← OutcomeRegistry (records trigger attestations)
  ApplicationRegistry (standalone)

Phase 2:
  VettedCredentialSBT ← CredentialRegistry (attestation required to mint)
  ProfileRegistry (standalone)

Phase 3:
  VettedGovernor → TimelockController → all existing contracts (parameter changes)
  GuildFactory → GuildRegistry (creates guilds)
  DisputeResolution → SlashingManager (executes slashing verdicts)
  AutomationKeeper → EndorsementBidding, RewardDistributor, ReputationManager

Phase 4:
  VettedDAO wraps VettedGovernor + TimelockController + Treasury
  Paymaster ← Treasury (gas funding)
  CrossChainBridge ← VettedCredentialSBT (portable credentials)
```

### Upgrade Strategy

- **UUPS Proxy pattern** for all new contracts (already standard in OpenZeppelin)
- **Governance-controlled upgrades** — DAO vote + 48h timelock for non-emergency upgrades
- **Emergency multisig** — 3-of-5 multisig for critical security patches (with 24h retroactive governance review)
- **Immutable core** — token contract should be non-upgradeable once stable
- **Version registry** — on-chain registry of contract versions for frontend compatibility

---

## Open Questions

- **Token economics:** Should VETD remain the sole token, or should governance use a separate token (veVETD, staked VETD, etc.)?
- **L2 selection:** Should we commit to a single L2 or design for multi-chain from the start?
- **ZK complexity:** Is the UX overhead of ZK proofs worth it for Phase 2 credentials, or should we start with simpler hash-based privacy?
- **Sequencing:** Should Phase 2 (candidate wallets) actually come before Phase 1 (verifiable outputs) since wallet adoption is a prerequisite for SBTs?
- **Revenue model:** How does the protocol sustain itself in a fully decentralized model? Protocol fees on endorsement bids? Job listing fees?
- **Regulatory:** How do on-chain hiring credentials interact with employment law in different jurisdictions?

---

*This is a living document. Update as the protocol evolves and as on-chain economics (gas costs, L2 maturity, ZK tooling) change.*
