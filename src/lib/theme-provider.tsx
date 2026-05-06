"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeRevealOrigin) => void;
};

type ResolvedTheme = "dark" | "light";

type ThemeRevealOrigin = {
  x: number;
  y: number;
};

type ViewTransitionDoc = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

const DURATION_TO_DARK_MS = 620;
const DURATION_TO_LIGHT_MS = 540;
const THEME_REVEAL_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyThemeToDOM(theme: ResolvedTheme) {
  const root = window.document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  root.style.removeProperty("background-color");
}

function getViewportCenter(): ThemeRevealOrigin {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

function animateThemeReveal(
  current: ResolvedTheme,
  next: ResolvedTheme,
  origin: ThemeRevealOrigin,
  commitTheme: () => void
) {
  const doc = document as ViewTransitionDoc;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!doc.startViewTransition || reduceMotion || current === next) {
    commitTheme();
    return;
  }

  const root = document.documentElement;
  const goingDark = next === "dark";
  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  );

  root.classList.add(goingDark ? "theme-going-dark" : "theme-going-light");

  const transition = doc.startViewTransition(() => {
    commitTheme();
  });

  transition.ready
    .then(() => {
      const fromClip = goingDark
        ? `circle(0px at ${origin.x}px ${origin.y}px)`
        : `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`;
      const toClip = goingDark
        ? `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`
        : `circle(0px at ${origin.x}px ${origin.y}px)`;

      root.animate(
        { clipPath: [fromClip, toClip] },
        {
          duration: goingDark ? DURATION_TO_DARK_MS : DURATION_TO_LIGHT_MS,
          easing: THEME_REVEAL_EASING,
          fill: "forwards",
          pseudoElement: goingDark
            ? "::view-transition-new(root)"
            : "::view-transition-old(root)",
        }
      );
    })
    .catch(() => {
      // Transition can be interrupted by rapid toggles. The committed theme is
      // still correct, so there is nothing to recover here.
    });

  transition.finished.finally(() => {
    root.classList.remove("theme-going-dark", "theme-going-light");
  });
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vetted-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (typeof window !== "undefined" && (localStorage.getItem(storageKey) as Theme)) || defaultTheme
  );

  React.useEffect(() => {
    applyThemeToDOM(resolveTheme(theme));
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme, origin?: ThemeRevealOrigin) => {
      const currentResolvedTheme = resolveTheme(theme);
      const nextResolvedTheme = resolveTheme(nextTheme);
      const commitTheme = () => {
        localStorage.setItem(storageKey, nextTheme);
        applyThemeToDOM(nextResolvedTheme);
        setTheme(nextTheme);
      };

      animateThemeReveal(
        currentResolvedTheme,
        nextResolvedTheme,
        origin ?? getViewportCenter(),
        commitTheme
      );
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
