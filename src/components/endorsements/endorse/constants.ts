import type { StepDef } from "@/components/guild/review/VerticalStepRail";

export const ENDORSE_STEP_JOB = 1;
export const ENDORSE_STEP_CANDIDATE = 2;
export const ENDORSE_STEP_APPLICATION = 3;
export const ENDORSE_STEP_STAKE = 4;

export const ENDORSE_STEPS: ReadonlyArray<StepDef> = [
  { number: ENDORSE_STEP_JOB, label: "Job context" },
  { number: ENDORSE_STEP_CANDIDATE, label: "Candidate" },
  { number: ENDORSE_STEP_APPLICATION, label: "Application" },
  { number: ENDORSE_STEP_STAKE, label: "Stake" },
];

export const ENDORSE_VIEW_STEPS: ReadonlyArray<StepDef> = ENDORSE_STEPS.slice(0, 3);

export type EndorseStep = 1 | 2 | 3 | 4;
export type EndorseModalMode = "endorse" | "view";
