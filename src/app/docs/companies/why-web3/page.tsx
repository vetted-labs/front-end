import type { Metadata } from "next";
import { Briefcase, Building2, ShieldCheck, FileText } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Why Web3 for hiring",
  description:
    "The trust argument for using an on-chain vetting protocol instead of a traditional applicant tracking system — without the crypto marketing fluff.",
};

const TOC = [
  { id: "the-fair-objection", title: "Start with the fair objection", level: 2 as const },
  { id: "three-things", title: "Three things only a chain does well", level: 2 as const },
  { id: "tamper-evidence", title: "1. Tamper evidence", level: 3 as const },
  { id: "accountability", title: "2. Staked accountability", level: 3 as const },
  { id: "portability", title: "3. Portable expert reputation", level: 3 as const },
  { id: "what-we-dont-claim", title: "What Vetted doesn't claim", level: 2 as const },
  { id: "what-you-touch", title: "What you actually touch as a company", level: 2 as const },
];

export default function WhyWeb3Page() {
  return (
    <DocsPage
      href="/docs/companies/why-web3"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For companies", href: "/docs/companies" },
        { label: "Why Web3 for hiring" },
      ]}
      eyebrow="For companies · Explainer"
      title="Why Web3 for hiring"
      description="Written for hiring leaders who are reasonably skeptical of 'crypto + hiring' as a category. No hand-waving — just the three specific properties of on-chain systems that Vetted actually uses."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Blockchain is used for exactly <strong>three things</strong>: tamper-evident <DocsGlossaryLink term="commit-reveal">commit-reveal</DocsGlossaryLink> commits, staked accountability (<DocsGlossaryLink term="slashing">slashing</DocsGlossaryLink>), and portable <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink>.</>,
          <>None of those three are visible to you as a company. You interact with a normal web app.</>,
          <>The chain makes reviews <strong>trustworthy</strong>; the experts make them <strong>good</strong>. Don't confuse the two.</>,
          <>No decentralisation theatre. Vetted runs the off-chain infrastructure like any other SaaS.</>,
        ]}
      />

      <h2 id="the-fair-objection">Start with the fair objection</h2>
      <p>
        Most "Web3 + hiring" pitches deserve the skepticism they get. A
        blockchain is an expensive, slow database, and 95% of the use cases
        people propose for it could be done better with a normal web
        service. If you're reading this and thinking <em>why is this on a
        chain at all?</em>, the question is fair and you're in good company.
      </p>
      <p>
        Vetted uses on-chain storage for exactly three things, and only
        three things. Everything else — your company account, your jobs,
        your candidate pipeline, messaging, analytics — runs on a normal
        server-backed web application that you log into with an email and
        password.
      </p>

      <h2 id="three-things">Three things only a chain does well</h2>

      <h3 id="tamper-evidence">1. Tamper evidence</h3>
      <p>
        Vetted's reviewing <DocsGlossaryLink term="guild">guilds</DocsGlossaryLink> use <strong>commit-reveal voting</strong>:
        experts submit a hash of their score in a first phase, then reveal
        the actual score in a second phase. For this to produce an honest
        signal, it has to be impossible for anyone — including Vetted the
        company — to edit a committed vote between commit and reveal.
      </p>
      <p>
        In a centralised database, nothing technical prevents an operator
        from rewriting a committed hash after seeing the reveal. You'd
        have to trust the operator. On-chain, the hash is signed by the
        reviewer's wallet and written to a public ledger; editing it
        retroactively is not possible without breaking the chain or
        stealing the reviewer's private key.
      </p>
      <p>
        <strong>What you get as a company:</strong> the shortlist you
        receive is backed by votes that literally could not have been
        tampered with, not even by us.
      </p>

      <h3 id="accountability">2. Staked accountability</h3>
      <p>
        Every review panel has a noise problem: what prevents a single
        reviewer from voting in bad faith or phoning it in? On
        traditional platforms the answer is "they get removed eventually,"
        which is slow and opaque.
      </p>
      <p>
        Vetted's answer is financial: reviewers stake VETD tokens when
        they review, and votes that deviate significantly from the
        panel's consensus automatically forfeit a percentage of the
        stake. The punishment is fast, deterministic, and not subject to
        anyone's discretion.
      </p>
      <p>
        <strong>What you get as a company:</strong> every expert on the
        panel has real money at risk on the accuracy of their review.
        Quality is enforced by the protocol, not by our content
        moderation team.
      </p>

      <h3 id="portability">3. Portable expert reputation</h3>
      <p>
        Expert reviewers earn reputation tied to their wallet, not to a
        row in our database. If Vetted shut down tomorrow, each expert
        would still have cryptographically-verifiable proof of their
        review track record. They can carry that reputation to any other
        platform — or present it directly to you — without our
        cooperation.
      </p>
      <p>
        This changes the equilibrium in the reviewer pool. Experts who
        know their reputation is theirs are willing to review more
        honestly and more consistently, because the reputation they build
        is a durable personal asset. Captured metrics on a traditional
        platform don't produce the same behaviour.
      </p>
      <p>
        <strong>What you get as a company:</strong> a reviewer pool that
        treats accuracy as a long-term career investment rather than a
        disposable interaction with our platform.
      </p>

      <DocsCallout kind="note" title="Note that these are expert-side mechanics">
        All three properties work on the expert reviewer side of the
        platform. As a company user, you don't interact with any of them
        directly. You see the downstream effect: better shortlists
        with less noise.
      </DocsCallout>

      <h2 id="what-we-dont-claim">What Vetted doesn't claim</h2>
      <ul>
        <li>
          <strong>We don't claim blockchain magically produces better
          candidates.</strong> The improvement comes from expert-backed
          review — which you could in theory run on any platform. The
          chain makes the reviews trustworthy; the experts make them good.
        </li>
        <li>
          <strong>We don't claim to be decentralised.</strong> Vetted the
          company runs the off-chain infrastructure: hosting, indexing,
          the web app, notifications, support. Only the three properties
          above are on-chain. "Full decentralisation" is a marketing
          claim, not a product.
        </li>
        <li>
          <strong>We don't pretend to be crypto-first.</strong> If you
          and your team never think about tokens or gas or wallets during
          your normal hiring work, that's the intended experience.
        </li>
      </ul>

      <h2 id="what-you-touch">What you actually touch as a company</h2>
      <p>
        The entire company side of Vetted is a standard web application.
        Concretely:
      </p>
      <ul>
        <li>
          <strong>Sign up and sign in with email and password</strong> (or
          LinkedIn OAuth). No wallet, no seed phrase, no chain
          interaction.
        </li>
        <li>
          <strong>Post jobs, manage applications, message candidates,
          view analytics</strong> through a normal dashboard UI.
        </li>
        <li>
          <strong>Never see the words "gas" or "transaction" or
          "signature"</strong> during your day-to-day use of the
          platform.
        </li>
      </ul>
      <p>
        The blockchain is an implementation detail of the reviewer side.
        You get the benefits of it (trustworthy reviews, staked
        accountability, portable reputation) without having to learn any
        new tools.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Blockchain = tamper-evident reviews. Everything else runs on a normal server like any other SaaS.</>,
          <>You sign up with email and password. No wallet, no tokens, no gas, no transactions — ever.</>,
          <>The reviewer pool behaves more honestly because their reputation is <em>theirs</em>, not ours.</>,
          <>Slashing enforces review quality automatically — no human moderation judgement required.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Post a job",
            description: "Create your company account and publish.",
            href: "/auth/signup?type=company",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Sign up",
            description: "Just create the account first; you can post later.",
            href: "/auth/signup?type=company",
            icon: Building2,
            kind: "app",
          },
          {
            title: "Guild-backed vetting",
            description: "What the review panel actually does.",
            href: "/docs/companies/guild-vetting",
            icon: ShieldCheck,
          },
          {
            title: "Quickstart",
            description: "30 minutes from signup to published job.",
            href: "/docs/companies/quickstart",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
