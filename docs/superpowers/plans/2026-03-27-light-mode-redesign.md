# Light Mode Redesign — Cool Slate + Orange Pop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch light mode from warm cream to cool slate neutrals so the orange brand color pops and cards have depth.

**Architecture:** Pure CSS variable swap in `globals.css` `:root` block (~18 tokens). All Tailwind utilities and component styles cascade automatically. One component-level shadow upgrade in `Card`. No layout, structure, or dark mode changes.

**Tech Stack:** CSS custom properties, Tailwind CSS 4 `@theme`

**Spec:** `docs/superpowers/specs/2026-03-27-light-mode-redesign-design.md`

---

### Task 1: Swap light mode CSS tokens to cool slate

**Files:**
- Modify: `src/app/globals.css:3-99` (`:root` block only)

This is the main change. Every token that had a warm hue (hue 30, saturation 8-40%) shifts to a cool slate hue (hue 210-215).

- [ ] **Step 1: Update background and surface tokens**

In `src/app/globals.css`, replace the `:root` block (lines 3-99) with these values. Only lines that change are listed — leave all other tokens untouched.

```css
/* Background colors - Cool slate with dark text */
--background: 213 27% 96%;          /* #f1f5f9 — cool slate */
--foreground: 0 0% 17%;             /* unchanged */

/* Secondary colors - Cool tint */
--secondary: 213 27% 97%;           /* #f8fafc */
--secondary-foreground: 0 0% 17%;   /* unchanged */

/* Muted colors - Slate gray */
--muted: 213 27% 96%;               /* #f1f5f9 — matches bg */
--muted-foreground: 215 16% 47%;    /* #64748b — slate gray */

/* Accent colors - Cool neutral (no longer soft orange) */
--accent: 213 27% 97%;              /* #f8fafc — cool neutral */
--accent-foreground: 215 25% 27%;   /* #334155 — dark slate */

/* Border colors - Cool, slightly stronger */
--border: 214 20% 88%;              /* #e2e8f0 */
--input: 214 20% 88%;               /* #e2e8f0 — matches border */

/* Surface hierarchy - Cool slate */
--surface-0: 213 27% 96%;           /* matches --background */
--surface-3: 210 20% 98%;           /* #f8fafc — cool hover */
--surface-border: 214 20% 88%;      /* matches --border */

/* Brand gray scale - Slate tones */
--gray-medium: 215 16% 47%;         /* #64748b */
--gray-light: 215 16% 57%;          /* #94a3b8 */
--gray-lighter: 214 20% 88%;        /* #e2e8f0 */
--gray-lightest: 210 20% 98%;       /* #f8fafc */

/* Accent neutrals - Cool versions */
--tan-accent: 214 15% 91%;          /* #e2e7ee */
--beige-light: 213 20% 95%;         /* #eef2f7 */
```

The full `:root` block after edits (showing all tokens for clarity — changed ones marked with `/* CHANGED */`):

```css
:root {
    /* Background colors - Cool slate with dark text */
    --background: 213 27% 96%;                   /* CHANGED */
    --foreground: 0 0% 17%;

    /* Card colors - Pure white cards on cool background */
    --card: 0 0% 100%;
    --card-foreground: 0 0% 17%;

    /* Popover colors */
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 17%;

    /* Primary brand colors - Vibrant orange */
    --primary: 24 100% 51%;
    --primary-foreground: 0 0% 100%;

    /* Secondary colors - Cool tint */
    --secondary: 213 27% 97%;                    /* CHANGED */
    --secondary-foreground: 0 0% 17%;

    /* Muted colors - Slate gray */
    --muted: 213 27% 96%;                        /* CHANGED */
    --muted-foreground: 215 16% 47%;             /* CHANGED */

    /* Accent colors - Cool neutral */
    --accent: 213 27% 97%;                       /* CHANGED */
    --accent-foreground: 215 25% 27%;            /* CHANGED */

    /* Destructive/Error colors */
    --destructive: 0 70% 50%;
    --destructive-foreground: 0 0% 100%;

    /* Border colors - Cool, slightly stronger */
    --border: 214 20% 88%;                       /* CHANGED */
    --input: 214 20% 88%;                        /* CHANGED */
    --ring: 24 100% 50%;

    /* Additional UI colors */
    --success: 158 64% 42%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --info: 24 100% 50%;
    --info-foreground: 0 0% 100%;

    /* Semantic status colors — desaturated for light mode */
    --positive: 155 55% 38%;
    --positive-foreground: 0 0% 100%;
    --negative: 0 45% 53%;
    --negative-foreground: 0 0% 100%;
    --info-blue: 213 30% 50%;
    --info-blue-foreground: 0 0% 100%;
    --neutral: 240 4% 46%;
    --neutral-foreground: 0 0% 100%;

    /* Rank progression — cool to warm */
    --rank-recruit: 215 17% 63%;
    --rank-apprentice: 160 59% 52%;
    --rank-craftsman: 24 100% 60%;
    --rank-officer: 24 100% 50%;
    --rank-master: 40 100% 50%;

    /* Surface hierarchy - Cool slate */
    --surface-0: 213 27% 96%;                    /* CHANGED */
    --surface-1: 0 0% 100%;
    --surface-2: 0 0% 100%;
    --surface-3: 210 20% 98%;                    /* CHANGED */
    --surface-border: 214 20% 88%;               /* CHANGED */

    /* Gradient button text - dark for contrast on orange */
    --gradient-button-text: 0 0% 4%;

    /* Chart colors - Orange spectrum */
    --chart-1: 24 100% 50%;
    --chart-2: 22 83% 58%;
    --chart-3: 27 96% 61%;
    --chart-4: 20 90% 48%;
    --chart-5: 30 100% 70%;

    /* Radius */
    --radius: 0.75rem;

    /* Brand gray scale - Slate tones */
    --gray-medium: 215 16% 47%;                  /* CHANGED */
    --gray-light: 215 16% 57%;                   /* CHANGED */
    --gray-lighter: 214 20% 88%;                 /* CHANGED */
    --gray-lightest: 210 20% 98%;                /* CHANGED */

    /* Accent neutrals - Cool versions */
    --tan-accent: 214 15% 91%;                   /* CHANGED */
    --beige-light: 213 20% 95%;                  /* CHANGED */

    /* Secondary oranges */
    --orange-secondary: 24 85% 60%;
    --orange-light: 24 100% 72%;
}
```

- [ ] **Step 2: Verify dark mode block is untouched**

Confirm the `.dark { ... }` block (lines 101-194) has zero changes. The dark mode palette must remain exactly as-is.

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`

Open `http://localhost:3000` in a browser. Switch to light mode. Verify:
- Page background is cool slate gray (not warm cream)
- Cards are white and clearly distinct from background
- Borders are visible cool gray
- Orange brand elements pop against the cool background
- Text is readable with good contrast
- Switch to dark mode and verify nothing changed

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor: switch light mode to cool slate palette for better contrast"
```

---

### Task 2: Upgrade card shadow for light mode

**Files:**
- Modify: `src/app/globals.css` (add card shadow custom property + `@theme` token)
- Modify: `src/components/ui/card.tsx:28` (upgrade shadow class)

- [ ] **Step 1: Add card shadow CSS variable**

In `src/app/globals.css`, add a `--card-shadow` variable to the `:root` block (after `--radius`):

```css
    /* Card elevation - cool-toned shadow for light mode */
    --card-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
```

And in the `.dark` block (after the existing radius or chart section):

```css
    /* Card elevation - keep existing dark mode shadows */
    --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
```

- [ ] **Step 2: Add shadow token to `@theme`**

In the `@theme inline { ... }` block in `globals.css`, add after the last `--color-*` line:

```css
    --shadow-card: var(--card-shadow);
```

- [ ] **Step 3: Upgrade Card component shadow**

In `src/components/ui/card.tsx`, line 28, change the shadow class:

Old:
```tsx
        "bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm border border-border/60",
```

New:
```tsx
        "bg-card/70 backdrop-blur-sm rounded-2xl shadow-card border border-border/60",
```

And on line 29, change the dark mode shadow:

Old:
```tsx
        "dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06] dark:shadow-lg dark:shadow-black/20",
```

New:
```tsx
        "dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06] dark:shadow-card",
```

- [ ] **Step 4: Verify card elevation**

Run: `npm run dev`

Open `http://localhost:3000` in light mode. Cards should have a subtle cool-toned shadow that creates visible lift from the slate background. In dark mode, cards should retain their existing shadow appearance.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/ui/card.tsx
git commit -m "refactor: add cool-toned card shadow token for light mode depth"
```

---

### Task 3: Visual verification across all views

**Files:** None (read-only verification)

- [ ] **Step 1: Verify expert dashboard**

Open `http://localhost:3000/dashboard` in light mode. Check:
- Stat cards (Reputation, Earnings, Staked, Reviews) have visible shadows and cool borders
- Review Queue and Rank Progress cards are clearly separated from background
- Guild chips have proper contrast
- Sidebar group labels (HOME, VETTING, GUILDS, GOVERNANCE, REWARDS) are slate gray, not orange
- Active nav item is orange with orange left border
- Notifications section has good readability

- [ ] **Step 2: Verify landing page**

Open `http://localhost:3000` logged out. Check:
- Navigation bar has clean white background with cool borders
- Hero section has good contrast
- Feature cards are elevated with shadows
- CTA buttons (orange) pop against the cool background
- Footer/bottom sections have consistent cool neutrals

- [ ] **Step 3: Verify candidate view**

Open candidate dashboard. Check:
- Application cards with status badges (active/pending/rejected) are readable
- Stat cards have proper elevation
- Job recommendation cards have visible card treatment

- [ ] **Step 4: Verify company view**

Open company dashboard. Check:
- Job listing cards with progress bars are readable
- Candidate list items have proper contrast
- Stat cards match the cool slate palette

- [ ] **Step 5: Verify dark mode unchanged**

Switch to dark mode and check expert dashboard, landing page, and at least one other view. Dark mode should look exactly the same as before — no cool slate leakage.

- [ ] **Step 6: Run lint check**

Run: `npm run lint`
Expected: No new warnings or errors related to the changes.

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.
