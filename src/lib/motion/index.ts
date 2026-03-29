// Motion system — barrel export
export {
  SPRINGS,
  SPRING_SNAPPY,
  SPRING_SMOOTH,
  SPRING_BOUNCY,
  SPRING_HEAVY,
  DURATIONS,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_SLOW,
  REDUCED_MOTION_TRANSITION,
} from "./presets";
export type { SpringPreset, DurationToken } from "./presets";

export { MotionProvider } from "./MotionProvider";
export type { MotionContextValue, MotionTransition } from "./MotionProvider";

export { useMotion } from "./hooks/useMotion";

// Primitives
export { FadeIn } from "./primitives/FadeIn";
export type { FadeInProps } from "./primitives/FadeIn";

export { SlideIn } from "./primitives/SlideIn";
export type { SlideInProps } from "./primitives/SlideIn";

export { Expand } from "./primitives/Expand";
export type { ExpandProps } from "./primitives/Expand";

export { Stagger } from "./primitives/Stagger";
export type { StaggerProps } from "./primitives/Stagger";

export { Reveal } from "./primitives/Reveal";
export type { RevealProps } from "./primitives/Reveal";

export { Counter } from "./primitives/Counter";
export type { CounterProps } from "./primitives/Counter";

export { DataSection } from "./primitives/DataSection";
export type { DataSectionProps } from "./primitives/DataSection";

export { PageTransition } from "./PageTransition";
