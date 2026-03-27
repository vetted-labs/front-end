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
