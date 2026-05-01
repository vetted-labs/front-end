import type {
  GeneralReviewTemplate,
  LevelReviewTemplate,
  ReviewModalApplication,
} from "@/types";

export const PRACTICE_REVIEW_GUILD_ID = "practice-engineering-guild";

export const PRACTICE_REVIEW_APPLICATION: ReviewModalApplication = {
  id: "practice-review-maya-chen",
  fullName: "Maya Chen",
  email: "maya.chen@example.test",
  expertiseLevel: "senior",
  yearsOfExperience: 7,
  currentTitle: "Senior Full-Stack Engineer",
  currentCompany: "Northstar Labs",
  bio:
    "Senior full-stack engineer focused on TypeScript, React, Node.js, analytics systems, and team mentorship.",
  motivation:
    "I want to join the Engineering guild to review production software evidence, help candidates improve their applications, and raise the quality bar for guild approvals.",
  expertiseAreas: ["TypeScript", "React", "Node.js", "System Design"],
  resumeUrl: "demo://maya-chen-resume",
  linkedinUrl: "https://example.test/maya-chen",
  portfolioUrl: "https://example.test/maya-chen-portfolio",
  applicationResponses: {
    level: "senior",
    general: {
      evidence_quality:
        "I shipped an analytics dashboard used by 40 enterprise teams, led a React migration from legacy state containers to typed server data flows, and mentored six engineers through design reviews.",
    },
    domain: {
      topics: {
        system_design:
          "Designed event ingestion with retries, queue backpressure, warehouse reconciliation, and dashboards for operational visibility.",
      },
    },
  },
};

export const PRACTICE_GENERAL_TEMPLATE: GeneralReviewTemplate = {
  generalQuestions: [
    {
      id: "evidence_quality",
      prompt: "Is the application backed by concrete evidence?",
    },
  ],
  rubric: {
    totalPoints: 5,
    questions: {
      evidence_quality: {
        maxPoints: 5,
        criteria: [
          {
            id: "specificity",
            label: "Specificity of evidence",
            maxPoints: 5,
          },
        ],
      },
    },
    redFlags: [
      {
        id: "unsupported_claims",
        label: "Unsupported claims",
        points: -2,
      },
    ],
    interpretationGuide: [
      {
        range: "4-5",
        label: "Strong",
        notes: ["Specific evidence and clear ownership are present."],
      },
      {
        range: "2-3",
        label: "Partial",
        notes: ["The claim is plausible, but important context is missing."],
      },
      {
        range: "0-1",
        label: "Weak",
        notes: ["The application does not show enough evidence to score higher."],
      },
    ],
  },
};

export const PRACTICE_LEVEL_TEMPLATE: LevelReviewTemplate = {
  templateName: "Senior Engineering practice rubric",
  description:
    "A demo rubric for learning how guild membership review scoring works.",
  totalPoints: 5,
  topics: [
    {
      id: "system_design",
      title: "System Design",
      prompt: "Evaluate production architecture evidence and tradeoff reasoning.",
      whatToLookFor: [
        "Clear ownership of a system or subsystem",
        "Tradeoffs around scale, failure modes, and operations",
        "Specific evidence instead of generic architecture claims",
      ],
      scoring: {
        five: "Specific production system with tradeoffs and measurable impact.",
        threeToFour: "Credible system evidence with some missing operational detail.",
        oneToTwo: "Mostly claims, buzzwords, or small-scope work.",
        zero: "No relevant evidence.",
      },
    },
  ],
};
