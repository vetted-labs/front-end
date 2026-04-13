import type { Metadata } from "next";
import { Briefcase, FileText, UserCircle, Handshake, Linkedin, ShieldCheck } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsComparison } from "@/components/docs/DocsComparison";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Endorsements & reputation",
  description:
    "How expert endorsements affect candidate hiring outcomes — and why they're different from recommendations on other platforms.",
};

const TOC = [
  { id: "what-they-are", title: "What an endorsement is", level: 2 as const },
  { id: "why-they-matter", title: "Why they matter for you", level: 2 as const },
  { id: "how-to-earn", title: "How to earn endorsements", level: 2 as const },
  { id: "vs-recommendations", title: "How this differs from LinkedIn-style recommendations", level: 2 as const },
  { id: "what-if", title: "What if nobody endorses me?", level: 2 as const },
];

export default function CandidateEndorsementsPage() {
  return (
    <DocsPage
      href="/docs/candidates/endorsements"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For candidates", href: "/docs/candidates" },
        { label: "Endorsements & reputation" },
      ]}
      eyebrow="For candidates · Core concept"
      title="Endorsements & reputation"
      description="Endorsements are the signal Vetted uses that LinkedIn and other platforms can't match. This page explains what they are, why they matter, and how to earn them."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>An <DocsGlossaryLink term="endorsement">endorsement</DocsGlossaryLink> is an expert <strong>publicly <DocsGlossaryLink term="stake">staking</DocsGlossaryLink> <DocsGlossaryLink term="vetd">VETD</DocsGlossaryLink></strong> on you — they lose money if you're not hired.</>,
          <>Unlike LinkedIn recs, endorsements <strong>cost the endorser real money</strong>, which is why the signal is informative.</>,
          <>You can't request them. Experts start them; you earn them through evidence-rich answers and public work.</>,
          <>Most candidates don't get endorsed on their first application. That's normal and <strong>not a failure</strong>.</>,
        ]}
      />

      <h2 id="what-they-are">What an endorsement is</h2>
      <p>
        An endorsement is a public, financial bet by a <DocsGlossaryLink term="guild">guild</DocsGlossaryLink> expert that you
        will be hired. The expert locks up a chosen amount of VETD tokens on
        your application. If you're hired, they get their stake back plus a
        reward and reputation gain. If you're not, 10% of their stake is
        slashed and they incur a reputation penalty.
      </p>
      <p>
        The important part is the word <em>lose</em>. On most hiring
        platforms, a recommendation or vouch is free — someone types a few
        sentences, clicks a button, and moves on. An endorsement on Vetted
        costs the endorser actual money if it turns out to be wrong. That's
        what makes the signal load-bearing.
      </p>

      <h2 id="why-they-matter">Why they matter for you</h2>
      <p>
        Three concrete effects:
      </p>
      <ul>
        <li>
          <strong>Hiring companies see them directly.</strong> Endorsements
          are surfaced on the shortlist the company reviews, alongside your
          consensus score. A candidate with two or three serious endorsements
          looks dramatically different from an unbacked candidate with the
          same score.
        </li>
        <li>
          <strong>They bias other experts' attention.</strong> Endorsements
          are public as they happen, so other experts in the guild know that
          someone with skin in the game already believes in you. That alone
          causes them to spend more time on your application.
        </li>
        <li>
          <strong>They accumulate into a track record.</strong> Candidates
          with multiple successful endorsements across platforms build a
          portable, on-chain reputation signal that carries to future
          applications — even at companies outside Vetted.
        </li>
      </ul>

      <DocsCallout kind="note" title="You don't control who endorses you">
        Endorsements are started by experts, not by you. There's no "request
        an endorsement" button. The system is designed so that endorsements
        reflect honest conviction, not social pressure.
      </DocsCallout>

      <h2 id="how-to-earn">How to earn endorsements</h2>
      <p>
        Earning endorsements is mostly indirect — it comes from writing
        application answers that are clearly evidence-rich and well-reasoned,
        and from having a public body of work that reviewers can click through
        to. Specific things that move the needle:
      </p>
      <ul>
        <li>
          <strong>Answer the "failure" question well.</strong> Experts are
          disproportionately likely to endorse candidates who show calibrated
          self-awareness. A crisp failure story with a clear lesson is more
          endorsable than a polished success story.
        </li>
        <li>
          <strong>Link to work that's easy to verify.</strong> Public GitHub
          repos, published writing, case studies with real screenshots — all
          of these lower the cost for an expert to form conviction, and
          therefore make endorsement more likely.
        </li>
        <li>
          <strong>Apply to jobs inside your core competence.</strong> A
          borderline application rarely gets endorsed. A strong application
          in a narrower domain is endorsed more often than a middling
          application in a hot field.
        </li>
      </ul>

      <h2 id="vs-recommendations">How this differs from LinkedIn-style recommendations</h2>
      <p>
        The side-by-side explains why endorsements carry signal where LinkedIn recommendations don't.
      </p>
      <DocsComparison
        left={{
          title: "LinkedIn recommendation",
          tagline: "Web2 pattern",
          icon: Linkedin,
          accent: "negative",
          rows: [
            <>Written for free — costs the writer nothing.</>,
            <>Frequently exchanged in kind, softly inflating everyone's score.</>,
            <>Carries near-zero weight in hiring decisions past the entry level.</>,
            <>Usually from someone you know personally.</>,
          ],
        }}
        right={{
          title: "Vetted endorsement",
          tagline: "Staked reputation",
          icon: ShieldCheck,
          accent: "positive",
          rows: [
            <>Costs the endorser real VETD — 10% slashed if you're not hired.</>,
            <>The endorser's own reputation moves on the outcome.</>,
            <>Surfaced on the company shortlist as a separate signal.</>,
            <>Made by a guild expert picked for the role, not your personal network.</>,
          ],
        }}
      />

      <h2 id="what-if">What if nobody endorses me?</h2>
      <p>
        Most candidates don't get endorsed on their first application, even
        ones who eventually get hired. Endorsements are a low-base-rate event
        because they cost real money — experts reserve them for high-
        conviction bets.
      </p>
      <p>
        Not getting endorsed doesn't mean you're failing. The consensus score
        from the regular review pool is what actually determines whether you
        move forward. Endorsements are upside on top of that, not a floor.
      </p>
      <DocsCallout kind="tip">
        If you're consistently scoring well but never getting endorsed, ask
        for feedback. Guild admins occasionally share anonymized review
        notes for candidates who request them — this can tell you which
        criterion to tighten up.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>Endorsements cost the expert real VETD — that's what makes them informative.</>,
          <>You cannot request endorsements. Experts choose to endorse on their own.</>,
          <>The consensus score is the floor. Endorsements are upside on top of it.</>,
          <>A strong failure story in your answers is disproportionately endorsable.</>,
          <>Not getting endorsed on early applications isn't a signal of failure — it's the baseline.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Browse jobs",
            description: "Apply to roles with strong application answers.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "My applications",
            description: "Track application status and see any endorsements.",
            href: "/candidate/applications",
            icon: FileText,
            kind: "app",
          },
          {
            title: "Edit my profile",
            description: "Stronger profiles earn endorsements more often.",
            href: "/candidate/profile",
            icon: UserCircle,
            kind: "app",
          },
          {
            title: "How endorsements work for experts",
            description: "Understand the expert's side of the decision.",
            href: "/docs/experts/endorsements",
            icon: Handshake,
          },
        ]}
      />
    </DocsPage>
  );
}
