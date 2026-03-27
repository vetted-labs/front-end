# Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified Framer Motion system with spring presets, motion primitives, enhanced UI components, and page transitions so the entire app feels smooth and alive.

**Architecture:** Three layers — Layer 1 is the motion foundation (provider, presets, 6 primitives, page transitions). Layer 2 enhances existing UI primitives (Button, Modal, Alert, Tabs, etc.) with motion baked in. Layer 3 adds cinematic sequences for 10 key journey moments. Each layer builds on the previous.

**Tech Stack:** Framer Motion, React 19, Next.js 15 App Router, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-27-motion-system-design.md`

---

## Task 1: Install Framer Motion & Create Motion Presets

**Files:**
- Modify: `package.json`
- Create: `src/lib/motion/presets.ts`
- Create: `src/lib/motion/index.ts`

- [ ] **Step 1: Install framer-motion**

Run: `npm install framer-motion`

- [ ] **Step 2: Create spring presets and duration tokens**

```typescript
// src/lib/motion/presets.ts
import type { Transition } from "framer-motion";

// === Spring Presets ===
// Components reference by name. Never define inline springs.

export const springs = {
  /** Buttons, toggles, small UI feedback */
  snappy: { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.5 },
  /** Page transitions, content fades, tab switches */
  smooth: { type: "spring" as const, stiffness: 200, damping: 25, mass: 0.8 },
  /** Celebrations, badges appearing, rank-ups */
  bouncy: { type: "spring" as const, stiffness: 300, damping: 15, mass: 0.8 },
  /** Modals, staking confirmations, high-stakes actions */
  heavy: { type: "spring" as const, stiffness: 150, damping: 20, mass: 1.2 },
} satisfies Record<string, Transition>;

export type SpringPreset = keyof typeof springs;

// === Duration Tokens ===
// Used for non-spring animations (opacity fades, color transitions).
// 3 values only — replaces 8 random durations scattered across the app.

export const durations = {
  /** Hover states, button feedback, micro-interactions */
  fast: 0.15,
  /** Content fades, tab switches, alerts appearing */
  normal: 0.25,
  /** Page transitions, modal entrance, expand/collapse */
  slow: 0.4,
} as const;

export type DurationToken = keyof typeof durations;

// === Fade Transition Helpers ===

export function fadeDuration(token: DurationToken = "normal"): Transition {
  return { duration: durations[token], ease: "easeOut" };
}
```

- [ ] **Step 3: Create barrel export**

```typescript
// src/lib/motion/index.ts
export { springs, durations, fadeDuration } from "./presets";
export type { SpringPreset, DurationToken } from "./presets";
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to motion files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion/ package.json package-lock.json
git commit -m "feat: add framer-motion with spring presets and duration tokens"
```

---

## Task 2: Create MotionProvider

**Files:**
- Create: `src/lib/motion/MotionProvider.tsx`
- Create: `src/lib/motion/hooks/useMotion.ts`
- Modify: `src/lib/motion/index.ts`
- Modify: `src/components/Providers.tsx`

- [ ] **Step 1: Create MotionProvider component**

```typescript
// src/lib/motion/MotionProvider.tsx
"use client";

import { createContext, ReactNode, useMemo } from "react";
import { MotionConfig } from "framer-motion";
import { springs, durations } from "./presets";
import type { SpringPreset, DurationToken } from "./presets";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useState } from "react";

interface MotionContextValue {
  /** True when user prefers reduced motion */
  reducedMotion: boolean;
  /** Duration scale — 1.0 normal, 0 for reduced motion */
  durationScale: number;
  /** Get a spring preset, returns instant transition if reduced motion */
  spring: (preset: SpringPreset) => typeof springs[SpringPreset];
  /** Get a duration in seconds, returns 0 if reduced motion */
  duration: (token: DurationToken) => number;
}

export const MotionContext = createContext<MotionContextValue | null>(null);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useMountEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  const value = useMemo<MotionContextValue>(() => {
    const durationScale = reducedMotion ? 0 : 1;
    return {
      reducedMotion,
      durationScale,
      spring: (preset) =>
        reducedMotion
          ? { type: "spring" as const, duration: 0 }
          : springs[preset],
      duration: (token) => (reducedMotion ? 0 : durations[token]),
    };
  }, [reducedMotion]);

  return (
    <MotionContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}
```

- [ ] **Step 2: Create useMotion hook**

```typescript
// src/lib/motion/hooks/useMotion.ts
"use client";

import { useContext } from "react";
import { MotionContext } from "../MotionProvider";
import { springs, durations } from "../presets";
import type { SpringPreset, DurationToken, } from "../presets";

/**
 * Access motion context (spring presets, duration tokens, reduced-motion state).
 * Falls back to defaults if used outside MotionProvider (e.g., in Storybook).
 */
export function useMotion() {
  const ctx = useContext(MotionContext);
  if (ctx) return ctx;

  // Fallback for usage outside provider
  return {
    reducedMotion: false,
    durationScale: 1,
    spring: (preset: SpringPreset) => springs[preset],
    duration: (token: DurationToken) => durations[token],
  };
}
```

- [ ] **Step 3: Update barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { MotionProvider } from "./MotionProvider";
export { useMotion } from "./hooks/useMotion";
```

- [ ] **Step 4: Wire MotionProvider into app providers**

In `src/components/Providers.tsx`, add the import and wrap after ThemeProvider:

```typescript
// Add import at top:
import { MotionProvider } from "@/lib/motion";

// In the JSX, wrap AuthProvider with MotionProvider:
<ThemeProvider defaultTheme="dark" storageKey="vetted-ui-theme">
  <MotionProvider>
    <AuthProvider>
      <Suspense>
        <NavigationProgress />
      </Suspense>
      {children}
    </AuthProvider>
  </MotionProvider>
</ThemeProvider>
```

- [ ] **Step 5: Verify dev server runs**

Run: `npm run dev` — open http://localhost:3000, verify no errors in console.

- [ ] **Step 6: Commit**

```bash
git add src/lib/motion/ src/components/Providers.tsx
git commit -m "feat: add MotionProvider with reduced-motion detection and spring/duration accessors"
```

---

## Task 3: Create FadeIn Primitive

**Files:**
- Create: `src/lib/motion/primitives/FadeIn.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create FadeIn component**

```typescript
// src/lib/motion/primitives/FadeIn.tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> {
  children: ReactNode;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration token — defaults to "normal" (250ms) */
  duration?: DurationToken;
  /** Direction to fade from — "up" adds translateY, "none" is pure opacity */
  direction?: "up" | "down" | "none";
  /** Distance in pixels for directional fade — default 8 */
  distance?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = "normal",
  direction = "up",
  distance = 8,
  className,
  ...motionProps
}: FadeInProps) {
  const { duration: getDuration } = useMotion();
  const dur = getDuration(duration);

  const yOffset = direction === "up" ? distance : direction === "down" ? -distance : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur, delay, ease: "easeOut" }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { FadeIn } from "./primitives/FadeIn";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add FadeIn motion primitive with direction and duration support"
```

---

## Task 4: Create SlideIn Primitive

**Files:**
- Create: `src/lib/motion/primitives/SlideIn.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create SlideIn component**

```typescript
// src/lib/motion/primitives/SlideIn.tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";

interface SlideInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> {
  children: ReactNode;
  /** Direction to slide from */
  from?: "left" | "right" | "top" | "bottom";
  /** Distance in pixels — default 24 */
  distance?: number;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Spring preset — defaults to "smooth" */
  spring?: SpringPreset;
  className?: string;
}

export function SlideIn({
  children,
  from = "left",
  distance = 24,
  delay = 0,
  spring = "smooth",
  className,
  ...motionProps
}: SlideInProps) {
  const { spring: getSpring } = useMotion();

  const axis = from === "left" || from === "right" ? "x" : "y";
  const sign = from === "left" || from === "top" ? -1 : 1;
  const offset = sign * distance;

  return (
    <motion.div
      initial={{ opacity: 0, [axis]: offset }}
      animate={{ opacity: 1, [axis]: 0 }}
      transition={{ ...getSpring(spring), delay }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { SlideIn } from "./primitives/SlideIn";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add SlideIn motion primitive with directional spring animation"
```

---

## Task 5: Create Expand Primitive

**Files:**
- Create: `src/lib/motion/primitives/Expand.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create Expand component**

This is the single biggest win — replaces 1000+ `{show && <div>}` instant show/hide patterns.

```typescript
// src/lib/motion/primitives/Expand.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

interface ExpandProps {
  /** Controls whether content is visible */
  isOpen: boolean;
  children: ReactNode;
  /** Duration token — defaults to "slow" (400ms) */
  duration?: DurationToken;
  className?: string;
}

export function Expand({
  isOpen,
  children,
  duration = "slow",
  className,
}: ExpandProps) {
  const { duration: getDuration } = useMotion();
  const dur = getDuration(duration);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: dur, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { Expand } from "./primitives/Expand";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add Expand motion primitive for smooth accordion/collapse transitions"
```

---

## Task 6: Create Stagger Primitive

**Files:**
- Create: `src/lib/motion/primitives/Stagger.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create Stagger component**

```typescript
// src/lib/motion/primitives/Stagger.tsx
"use client";

import { motion } from "framer-motion";
import { Children, ReactNode } from "react";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";

interface StaggerProps {
  children: ReactNode;
  /** Delay between each child — default 0.06s (60ms) */
  staggerDelay?: number;
  /** Spring preset for each child — defaults to "smooth" */
  spring?: SpringPreset;
  /** Max items to stagger — rest appear instantly. Default 12. */
  limit?: number;
  className?: string;
}

const containerVariants = (staggerDelay: number) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function Stagger({
  children,
  staggerDelay = 0.06,
  spring = "smooth",
  limit = 12,
  className,
}: StaggerProps) {
  const { spring: getSpring, reducedMotion } = useMotion();
  const springConfig = getSpring(spring);

  const items = Children.toArray(children);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          variants={i < limit ? itemVariants : { hidden: { opacity: 1 }, visible: { opacity: 1 } }}
          transition={i < limit ? springConfig : { duration: 0 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { Stagger } from "./primitives/Stagger";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add Stagger motion primitive for cascading list/grid entrances"
```

---

## Task 7: Create Reveal (Scroll-Triggered) Primitive

**Files:**
- Create: `src/lib/motion/primitives/Reveal.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create Reveal component**

```typescript
// src/lib/motion/primitives/Reveal.tsx
"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

interface RevealProps {
  children: ReactNode;
  /** Intersection threshold — default 0.2 (20% visible) */
  threshold?: number;
  /** Only animate once — default true */
  once?: boolean;
  /** Duration token — defaults to "normal" */
  duration?: DurationToken;
  /** Direction to fade from — defaults to "up" */
  direction?: "up" | "down" | "none";
  /** Distance in px — default 16 */
  distance?: number;
  /** Delay in seconds */
  delay?: number;
  className?: string;
}

export function Reveal({
  children,
  threshold = 0.2,
  once = true,
  duration = "normal",
  direction = "up",
  distance = 16,
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: threshold, once });
  const { duration: getDuration } = useMotion();
  const dur = getDuration(duration);

  const yOffset = direction === "up" ? distance : direction === "down" ? -distance : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{ duration: dur, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { Reveal } from "./primitives/Reveal";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add Reveal motion primitive for scroll-triggered fade-in"
```

---

## Task 8: Create Counter Primitive

**Files:**
- Create: `src/lib/motion/primitives/Counter.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create Counter component**

```typescript
// src/lib/motion/primitives/Counter.tsx
"use client";

import { useSpring, useTransform, motion, useMotionValue } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

interface CounterProps {
  /** The target numeric value */
  value: number;
  /** Format — "number" uses toLocaleString, "currency" prepends $, "percent" appends % */
  format?: "number" | "currency" | "percent";
  /** Spring preset — defaults to "snappy" */
  spring?: SpringPreset;
  /** CSS class for the wrapper span */
  className?: string;
}

export function Counter({
  value,
  format = "number",
  spring = "snappy",
  className,
}: CounterProps) {
  const { spring: getSpring, reducedMotion } = useMotion();
  const springConfig = getSpring(spring);

  const motionValue = useMotionValue(reducedMotion ? value : 0);
  const springValue = useSpring(motionValue, springConfig);

  const display = useTransform(springValue, (latest) => {
    const rounded = Math.round(latest);
    const formatted = rounded.toLocaleString();
    switch (format) {
      case "currency": return `$${formatted}`;
      case "percent": return `${formatted}%`;
      default: return formatted;
    }
  });

  // Animate to target on mount and value change
  // eslint-disable-next-line no-restricted-syntax -- spring animation depends on value runtime changes
  useMountEffect(() => {
    motionValue.set(value);
  });

  // Update when value changes after mount
  // eslint-disable-next-line no-restricted-syntax -- must update spring target when value prop changes
  if (motionValue.get() !== value && reducedMotion) {
    motionValue.set(value);
  } else if (motionValue.getPrevious() !== undefined) {
    motionValue.set(value);
  }

  if (reducedMotion) {
    const formatted = value.toLocaleString();
    const text = format === "currency" ? `$${formatted}` : format === "percent" ? `${formatted}%` : formatted;
    return <span className={className}>{text}</span>;
  }

  return <motion.span className={className}>{display}</motion.span>;
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { Counter } from "./primitives/Counter";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion/
git commit -m "feat: add Counter motion primitive for animated number transitions"
```

---

## Task 9: Create Page Transition (template.tsx)

**Files:**
- Create: `src/app/template.tsx`
- Create: `src/lib/motion/PageTransition.tsx`
- Modify: `src/lib/motion/index.ts`

- [ ] **Step 1: Create PageTransition component**

```typescript
// src/lib/motion/PageTransition.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { durations } from "./presets";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create template.tsx**

```typescript
// src/app/template.tsx
import { PageTransition } from "@/lib/motion/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
```

- [ ] **Step 3: Update barrel export**

Add to `src/lib/motion/index.ts`:

```typescript
export { PageTransition } from "./PageTransition";
```

- [ ] **Step 4: Verify page transitions work**

Run: `npm run dev` — navigate between pages and confirm crossfade is visible.

- [ ] **Step 5: Commit**

```bash
git add src/app/template.tsx src/lib/motion/
git commit -m "feat: add page transitions via template.tsx with fade-up entrance"
```

---

## Task 10: Enhance Button with Motion Feedback

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Add Framer Motion press and hover feedback**

Replace the full `button.tsx` content. Key changes: wrap in `motion.button`, add `whileTap` and `whileHover`, crossfade loading state.

```typescript
// src/components/ui/button.tsx
"use client";

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { springs } from "@/lib/motion"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/20 shadow-sm hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const MotionButton = motion.create(
  React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    (props, ref) => <button ref={ref} {...props} />
  )
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, icon, disabled, children, ...props }, ref) => {
    // Disable motion for link variant (no scale on text links)
    const isLink = variant === "link";

    return (
      <MotionButton
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        whileTap={isLink ? undefined : { scale: 0.97 }}
        whileHover={isLink ? undefined : { scale: 1.02 }}
        transition={springs.snappy}
        {...props}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mr-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.span>
          ) : icon ? (
            <motion.span
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mr-2"
            >
              {icon}
            </motion.span>
          ) : null}
        </AnimatePresence>
        {children}
      </MotionButton>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Verify buttons work across the app**

Run: `npm run dev` — click various buttons, verify press feedback (subtle scale down) and hover lift. Check loading states still work.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: add whileTap/whileHover motion feedback to Button component"
```

---

## Task 11: Enhance Modal with Framer Motion Springs

**Files:**
- Modify: `src/components/ui/modal.tsx`

- [ ] **Step 1: Replace CSS transitions with Framer Motion**

Key changes: use `AnimatePresence` + `motion.div` for backdrop and content. Remove manual `visible` state timing — Framer handles exit animations. Preserve all focus trap and accessibility logic.

```typescript
// src/components/ui/modal.tsx
"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { springs, durations } from "@/lib/motion";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useMountEffect(() => {
    setMounted(true);
  });

  // eslint-disable-next-line no-restricted-syntax -- body overflow depends on isOpen runtime value
  useMountEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      previousFocusRef.current = document.activeElement;
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  });

  // Focus first focusable element when opened
  const handleAnimationComplete = useCallback(() => {
    if (isOpen && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [isOpen]);

  // Focus restoration on close
  const handleExitComplete = useCallback(() => {
    document.body.style.overflow = "unset";
    if (previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, []);

  // Escape key to close + focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  if (!mounted) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl"
  };

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durations.fast }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div
              ref={contentRef}
              role="dialog"
              aria-modal="true"
              {...(title ? { "aria-label": title } : {})}
              className={`relative bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col overflow-hidden border border-border/60 dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06]`}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={springs.heavy}
              onAnimationComplete={handleAnimationComplete}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                  <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 overflow-y-auto min-h-0 ${title ? "p-4 sm:p-6" : "p-4 sm:p-6 relative"}`}>
                {!title && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
```

- [ ] **Step 2: Verify modals work**

Run: `npm run dev` — open/close modals across the app (staking modal, job detail, etc.). Verify spring entrance and smooth exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/modal.tsx
git commit -m "feat: migrate Modal to Framer Motion springs with AnimatePresence exit"
```

---

## Task 12: Enhance Alert with Entrance Animation

**Files:**
- Modify: `src/components/ui/alert.tsx`

- [ ] **Step 1: Add motion entrance to Alert**

```typescript
// src/components/ui/alert.tsx
"use client";

import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { durations } from "@/lib/motion";

interface AlertProps {
  variant?: "error" | "success" | "warning" | "info";
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = "info", children, onClose, className = "" }: AlertProps) {
  const styles = {
    error: {
      container: "bg-destructive/10 border-destructive/20 text-destructive",
      icon: <XCircle className="w-5 h-5 text-destructive" />
    },
    success: {
      container: "bg-positive/10 border-positive/20 text-positive",
      icon: <CheckCircle2 className="w-5 h-5 text-positive" />
    },
    warning: {
      container: "bg-warning/10 border-warning/20 text-warning",
      icon: <AlertCircle className="w-5 h-5 text-warning" />
    },
    info: {
      container: "bg-primary/10 border-primary/20 text-primary",
      icon: <Info className="w-5 h-5 text-primary" />
    }
  };

  const { container, icon } = styles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: "easeOut" }}
      className={`p-4 border rounded-lg flex items-start gap-3 ${container} ${className}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/alert.tsx
git commit -m "feat: add slide-down entrance animation to Alert component"
```

---

## Task 13: Enhance Tabs with Content Crossfade

**Files:**
- Modify: `src/components/ui/tabs.tsx`

- [ ] **Step 1: Add AnimatePresence to TabsContent**

```typescript
// src/components/ui/tabs.tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { durations } from "@/lib/motion"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-primary/80",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: "easeOut" }}
      key={props.value}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/tabs.tsx
git commit -m "feat: add content crossfade animation to Tabs component"
```

---

## Task 14: Create Accordion Component

**Files:**
- Create: `src/components/ui/accordion.tsx`

- [ ] **Step 1: Create Accordion built on Expand primitive**

```typescript
// src/components/ui/accordion.tsx
"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Expand } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({ title, children, defaultOpen = false, className }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-border/40 last:border-b-0", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {typeof title === "string" ? <span>{title}</span> : title}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <Expand isOpen={isOpen}>
        <div className="pb-3">
          {children}
        </div>
      </Expand>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={cn("divide-y divide-border/40", className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/accordion.tsx
git commit -m "feat: add Accordion component built on Expand motion primitive"
```

---

## Task 15: Create ContentLoader (Skeleton → Content Crossfade)

**Files:**
- Create: `src/components/ui/content-loader.tsx`

- [ ] **Step 1: Create ContentLoader component**

```typescript
// src/components/ui/content-loader.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { durations } from "@/lib/motion";

interface ContentLoaderProps {
  /** Whether data is still loading */
  isLoading: boolean;
  /** Skeleton placeholder to show while loading */
  fallback: ReactNode;
  /** The actual content to show when loaded */
  children: ReactNode;
  className?: string;
}

export function ContentLoader({
  isLoading,
  fallback,
  children,
  className,
}: ContentLoaderProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durations.fast }}
          >
            {fallback}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: durations.normal }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/content-loader.tsx
git commit -m "feat: add ContentLoader component for skeleton-to-content crossfade"
```

---

## Task 16: Fix Broken Endorsement Animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add missing endo-ring-spin and endo-card-spin keyframes**

Add these keyframes to `src/app/globals.css` near the other animation definitions (after the emblem-pulse animations around line 758):

```css
@keyframes endo-ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes endo-card-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Verify endorsement cards render with spinning rings**

Run: `npm run dev` — navigate to endorsements section, confirm spinning animation works.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: add missing endo-ring-spin and endo-card-spin keyframe definitions"
```

---

## Task 17: Remove Migrated CSS Keyframes

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Remove page-enter and section-enter keyframes**

In `src/app/globals.css`, remove the `page-enter` keyframe block (lines 328-337), the `section-enter` keyframe, the `.animate-page-enter` and `.animate-section-enter` utility classes, and the associated `prefers-reduced-motion` rules. Keep a comment:

```css
/* Page and section entrance animations migrated to Framer Motion (PageTransition, FadeIn) */
```

- [ ] **Step 2: Remove modal-backdrop-in and modal-scale-in keyframes**

Remove the `modal-backdrop-in` keyframe (lines 568-571), `modal-scale-in` keyframe (lines 573-576), and their utility classes (`.animate-modal-backdrop-in`, `.animate-modal-scale-in`). Modal now uses Framer Motion springs.

```css
/* Modal animations migrated to Framer Motion (Modal component) */
```

- [ ] **Step 3: Remove message-in keyframe**

Remove `message-in` keyframe and its utility class. Replaced by `FadeIn` primitive.

- [ ] **Step 4: Consolidate remaining keyframes**

Add a section comment at the top of the ambient animations block:

```css
/* === Ambient Animations (CSS) ===
 * These infinite/ambient animations remain as CSS keyframes.
 * Entrance/exit/interactive animations use Framer Motion.
 * - float, glow-pulse, draw-line, shimmer-border
 * - celebrate-*, confetti-fall, sparkle (celebration suite)
 * - nav-progress, nav-complete (navigation bar)
 * - emblem-pulse, emblem-pulse-idle (guild cards)
 * - rep-* (reputation page suite)
 * - avatar-*, ambient-drift (profile)
 * - endo-ring-spin, endo-card-spin (endorsements)
 */
```

- [ ] **Step 5: Remove animate-page-enter usage from components**

Search for all components using `animate-page-enter` class and remove it — the `PageTransition` in `template.tsx` now handles page entrance globally. Files that use this class:
- `src/components/candidate/CandidateGuilds.tsx`
- `src/components/candidate/CandidateProfilePage.tsx`
- `src/components/candidate/CandidateDashboard.tsx`
- `src/components/candidate/CandidateApplications.tsx`
- `src/components/browse/BrowsePage.tsx`
- Any others found via grep for `animate-page-enter`

In each file, remove the `animate-page-enter` class from the outermost wrapper div.

- [ ] **Step 6: Remove animate-fade-up usage from HeroSection**

In `src/components/home/HeroSection.tsx`, remove `animate-fade-up` and `animate-delay-*` classes. These will be replaced when the HeroSection cinematic sequence is built (Task 18). For now, the page-level `PageTransition` handles the entrance.

- [ ] **Step 7: Verify no broken references**

Run: `npm run build` — verify no build errors.
Run: `grep -r "animate-page-enter\|animate-section-enter\|animate-modal-backdrop-in\|animate-modal-scale-in\|animate-message-in" src/` — verify no remaining references.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/components/
git commit -m "refactor: remove CSS keyframes migrated to Framer Motion, consolidate ambient animations"
```

---

## Task 18: Landing Page Hero Sequence

**Files:**
- Create: `src/components/sequences/LandingHeroSequence.tsx`
- Modify: `src/components/home/HeroSection.tsx`

- [ ] **Step 1: Create orchestrated hero sequence**

```typescript
// src/components/sequences/LandingHeroSequence.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { springs, durations } from "@/lib/motion";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...springs.smooth },
  },
};

interface LandingHeroSequenceProps {
  children: ReactNode;
  className?: string;
}

export function LandingHeroSequence({ children, className }: LandingHeroSequenceProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Integrate into HeroSection**

In `src/components/home/HeroSection.tsx`, import `LandingHeroSequence` and `HeroItem`, then wrap existing content sections:

```tsx
import { LandingHeroSequence, HeroItem } from "@/components/sequences/LandingHeroSequence";

// In the JSX, wrap the main content container:
<LandingHeroSequence className="...existing classes...">
  <HeroItem>
    {/* Badge section */}
  </HeroItem>
  <HeroItem>
    {/* Value cards grid */}
  </HeroItem>
  <HeroItem>
    {/* Guild pills */}
  </HeroItem>
</LandingHeroSequence>
```

Remove inline `animationDelay` styles and `animate-fade-up` classes from the wrapped elements.

- [ ] **Step 3: Verify hero entrance**

Run: `npm run dev` — visit homepage, verify staggered entrance of hero elements.

- [ ] **Step 4: Commit**

```bash
git add src/components/sequences/LandingHeroSequence.tsx src/components/home/HeroSection.tsx
git commit -m "feat: add orchestrated hero entrance sequence with spring stagger"
```

---

## Task 19: Apply Stagger to Key List/Grid Pages

**Files:**
- Modify: `src/components/browse/JobsListing.tsx`
- Modify: `src/components/guilds/GuildsListingPage.tsx`
- Modify: `src/components/dashboard/CompanyDashboardOverview.tsx`

- [ ] **Step 1: Add Stagger to job cards listing**

In `src/components/browse/JobsListing.tsx`, import `Stagger` and wrap the job cards grid:

```tsx
import { Stagger } from "@/lib/motion";

// Wrap the grid of JobCard components:
<Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {jobs.map(job => <JobCard key={job.id} job={job} />)}
</Stagger>
```

- [ ] **Step 2: Add Stagger to guilds listing**

In `src/components/guilds/GuildsListingPage.tsx`, import `Stagger` and wrap the guilds grid similarly.

- [ ] **Step 3: Add Stagger to dashboard stat cards**

In `src/components/dashboard/CompanyDashboardOverview.tsx`, import `Stagger` and wrap the stat cards grid.

- [ ] **Step 4: Verify staggered entrances**

Run: `npm run dev` — visit browse page, guilds page, and company dashboard. Verify cards cascade in with 60ms stagger delay.

- [ ] **Step 5: Commit**

```bash
git add src/components/browse/JobsListing.tsx src/components/guilds/GuildsListingPage.tsx src/components/dashboard/CompanyDashboardOverview.tsx
git commit -m "feat: add staggered entrance animation to job cards, guilds grid, and dashboard stats"
```

---

## Task 20: Apply Reveal to Below-Fold Sections

**Files:**
- Modify: `src/components/home/StatsBar.tsx`
- Modify: `src/components/home/JobBrowser.tsx`
- Modify: `src/components/HomePage.tsx`

- [ ] **Step 1: Wrap StatsBar in Reveal**

In `src/components/home/StatsBar.tsx`, import `Reveal` and wrap the outer container:

```tsx
import { Reveal } from "@/lib/motion";

// Wrap the stats bar section:
<Reveal direction="up" distance={16}>
  {/* existing stats bar content */}
</Reveal>
```

- [ ] **Step 2: Wrap JobBrowser in Reveal**

In `src/components/home/JobBrowser.tsx`, import `Reveal` and wrap the section.

- [ ] **Step 3: Wrap below-fold sections in HomePage**

In `src/components/HomePage.tsx`, import `Reveal` and wrap any sections that appear below the fold.

- [ ] **Step 4: Verify scroll reveals**

Run: `npm run dev` — scroll down the homepage and verify sections fade in as they enter the viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/StatsBar.tsx src/components/home/JobBrowser.tsx src/components/HomePage.tsx
git commit -m "feat: add scroll-triggered Reveal animations to homepage below-fold sections"
```

---

## Task 21: Apply Counter to StatCard and Key Numeric Displays

**Files:**
- Modify: `src/components/dashboard/StatCard.tsx`
- Modify: `src/components/endorsements/EndorsementStatsGrid.tsx`
- Modify: `src/components/home/StatsBar.tsx`

- [ ] **Step 1: Update StatCard to use Counter**

In `src/components/dashboard/StatCard.tsx`, replace the static number display with Counter:

```tsx
import { Counter } from "@/lib/motion";

// Replace line 56-58:
// OLD: {typeof value === "number" ? value.toLocaleString() : value}
// NEW:
<div className="text-3xl font-display font-bold text-foreground tracking-tight leading-none mb-1.5">
  {typeof value === "number" ? (
    <Counter value={value} />
  ) : (
    value
  )}
</div>
```

- [ ] **Step 2: Update EndorsementStatsGrid numbers**

In `src/components/endorsements/EndorsementStatsGrid.tsx`, replace stat number displays with `Counter` where numeric values are shown.

- [ ] **Step 3: Update StatsBar numbers on homepage**

In `src/components/home/StatsBar.tsx`, replace stat numbers with `Counter`.

- [ ] **Step 4: Verify counter animations**

Run: `npm run dev` — visit dashboard and homepage, verify numbers tick up from 0 on initial render.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/StatCard.tsx src/components/endorsements/EndorsementStatsGrid.tsx src/components/home/StatsBar.tsx
git commit -m "feat: add animated Counter to stat cards, endorsement stats, and homepage stats"
```

---

## Task 22: Apply Expand to Existing Accordion Patterns

**Files:**
- Modify: `src/components/expert/CommitRevealExplainer.tsx`
- Modify: `src/components/dashboard/GuildsSection.tsx`
- Modify: `src/components/candidate/RejectionFeedbackCard.tsx` (if it exists)

- [ ] **Step 1: Migrate CommitRevealExplainer to Expand**

In `src/components/expert/CommitRevealExplainer.tsx`, find the `{expanded && (...)}` pattern and replace with `Expand`:

```tsx
import { Expand } from "@/lib/motion";

// Replace {expanded && <div>...content...</div>} with:
<Expand isOpen={expanded}>
  {/* existing expanded content */}
</Expand>
```

- [ ] **Step 2: Migrate GuildsSection expandable content**

In `src/components/dashboard/GuildsSection.tsx`, find and replace any `{show && <div>}` patterns with `Expand`.

- [ ] **Step 3: Migrate any other accordion patterns found**

Search for common expand/collapse patterns:

Run: `grep -rn "expanded && \|isExpanded && \|showMore && \|isOpen && " src/components/ --include="*.tsx" | head -20`

For each match, evaluate whether `Expand` is appropriate and migrate.

- [ ] **Step 4: Verify smooth expand/collapse**

Run: `npm run dev` — test each migrated accordion. Verify smooth height animation instead of instant pop.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: migrate accordion/expand patterns to Expand motion primitive"
```

---

## Task 23: Apply FadeIn to Conditional Content Renders

**Files:**
- Various components with `{condition && <Content>}` patterns

- [ ] **Step 1: Identify high-traffic conditional renders**

Focus on the most visible patterns:
- Error/success messages that appear after form submission
- Empty states that swap in when data loads
- Filter result changes

Run: `grep -rn "error &&\|success &&\|isEmpty &&\|noResults &&" src/components/ --include="*.tsx" | head -20`

- [ ] **Step 2: Wrap key conditional renders with FadeIn**

For each identified pattern, wrap the conditionally rendered content:

```tsx
import { FadeIn } from "@/lib/motion";
import { AnimatePresence } from "framer-motion";

// Replace: {error && <Alert>...</Alert>}
// With:
<AnimatePresence>
  {error && (
    <FadeIn key="error">
      <Alert variant="error">{error}</Alert>
    </FadeIn>
  )}
</AnimatePresence>
```

Since Alert already has its own entrance animation (Task 12), this is mainly for other conditional content like success messages, empty states, and result panels.

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add FadeIn transitions to high-visibility conditional content renders"
```

---

## Task 24: Verify Full Build & Final Cleanup

**Files:**
- Modify: `src/lib/motion/index.ts` (final barrel export verification)
- Modify: `CLAUDE.md` (add motion system guidelines)

- [ ] **Step 1: Verify full build succeeds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors from motion files.

- [ ] **Step 3: Verify final barrel export is complete**

Ensure `src/lib/motion/index.ts` exports everything:

```typescript
// src/lib/motion/index.ts
export { springs, durations, fadeDuration } from "./presets";
export type { SpringPreset, DurationToken } from "./presets";
export { MotionProvider } from "./MotionProvider";
export { useMotion } from "./hooks/useMotion";
export { FadeIn } from "./primitives/FadeIn";
export { SlideIn } from "./primitives/SlideIn";
export { Expand } from "./primitives/Expand";
export { Stagger } from "./primitives/Stagger";
export { Reveal } from "./primitives/Reveal";
export { Counter } from "./primitives/Counter";
export { PageTransition } from "./PageTransition";
```

- [ ] **Step 4: Add motion system rules to CLAUDE.md**

Add a new section to `CLAUDE.md` under "### Key Patterns":

```markdown
### Motion System

All animations use the centralized motion system in `src/lib/motion/`. Never write inline Framer Motion variants or custom springs in components.

**Imports:** `import { FadeIn, Expand, Stagger, Reveal, Counter, SlideIn, springs, durations } from "@/lib/motion"`

**Rules:**
- Use `Expand` for any show/hide conditional content — never `{show && <div>}`
- Use `Stagger` for any list/grid of items
- Use `Counter` for any numeric display that changes
- Use `Reveal` for below-fold content on long pages
- Use `FadeIn` for general entrance animations
- Reference spring presets by name (`springs.snappy`, etc.) — never define inline springs
- Reference duration tokens (`durations.fast`, etc.) — never hardcode ms values
- Keep CSS keyframes for ambient/infinite animations (float, glow, drift)
- Use Framer Motion for entrance/exit/interactive animations
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion/index.ts CLAUDE.md
git commit -m "chore: finalize motion system barrel exports and add guidelines to CLAUDE.md"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install Framer Motion + presets | `package.json`, `src/lib/motion/presets.ts` |
| 2 | MotionProvider + useMotion hook | `src/lib/motion/MotionProvider.tsx`, `Providers.tsx` |
| 3 | FadeIn primitive | `src/lib/motion/primitives/FadeIn.tsx` |
| 4 | SlideIn primitive | `src/lib/motion/primitives/SlideIn.tsx` |
| 5 | Expand primitive | `src/lib/motion/primitives/Expand.tsx` |
| 6 | Stagger primitive | `src/lib/motion/primitives/Stagger.tsx` |
| 7 | Reveal primitive | `src/lib/motion/primitives/Reveal.tsx` |
| 8 | Counter primitive | `src/lib/motion/primitives/Counter.tsx` |
| 9 | Page transitions (template.tsx) | `src/app/template.tsx`, `PageTransition.tsx` |
| 10 | Button motion feedback | `src/components/ui/button.tsx` |
| 11 | Modal Framer Motion springs | `src/components/ui/modal.tsx` |
| 12 | Alert entrance animation | `src/components/ui/alert.tsx` |
| 13 | Tabs content crossfade | `src/components/ui/tabs.tsx` |
| 14 | Accordion component | `src/components/ui/accordion.tsx` |
| 15 | ContentLoader crossfade | `src/components/ui/content-loader.tsx` |
| 16 | Fix broken endo animations | `src/app/globals.css` |
| 17 | Remove migrated CSS keyframes | `globals.css`, various components |
| 18 | Landing hero sequence | `src/components/sequences/LandingHeroSequence.tsx` |
| 19 | Stagger on list pages | `JobsListing`, `GuildsListingPage`, `CompanyDashboard` |
| 20 | Reveal on homepage sections | `StatsBar`, `JobBrowser`, `HomePage` |
| 21 | Counter on stat displays | `StatCard`, `EndorsementStatsGrid`, `StatsBar` |
| 22 | Expand on accordion patterns | `CommitRevealExplainer`, `GuildsSection`, etc. |
| 23 | FadeIn on conditional renders | Various components |
| 24 | Build verification + CLAUDE.md | `index.ts`, `CLAUDE.md` |

**Note:** The 10 cinematic journey sequences (Tasks 18 covers hero only) will be implemented in a follow-up plan. This plan establishes the complete foundation + universal baseline + hero sequence. The remaining 9 cinematic sequences (application submit, job post, guild join, staking, governance vote, endorsement reveal, application accepted, rank up, claim rewards) build naturally on top of this system.
