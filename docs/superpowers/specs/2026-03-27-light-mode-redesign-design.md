# Light Mode Redesign — Cool Slate + Orange Pop

**Date:** 2026-03-27
**Status:** Approved

## Problem

The current light mode uses a warm cream background (#faf8f5) with pure white cards, resulting in:
- Low contrast between background and cards (barely distinguishable)
- Flat, washed-out feel with no depth hierarchy
- Orange doing all the visual heavy lifting with no supporting neutrals
- Borders too subtle (warm gray at 90% lightness)
- No shadows, everything feels same-level

## Solution: Cool Slate + Subtle Shadows

Switch light mode from warm cream to a cool blue-gray neutral palette. The cool temperature creates natural contrast with the warm brand orange through temperature opposition, making orange elements pop without needing more color.

### Color Token Changes (Light Mode Only)

All changes are to CSS custom properties in `:root` in `globals.css`. Dark mode is unaffected.

| Token | Current (HSL) | New (HSL) | Hex Approx | Purpose |
|-------|--------------|-----------|------------|---------|
| `--background` | `30 40% 98%` | `213 27% 96%` | #f1f5f9 | Page background — cool slate |
| `--card` | `0 0% 100%` | `0 0% 100%` | #ffffff | Cards — unchanged (white) |
| `--secondary` | `30 100% 97%` | `213 27% 97%` | #f8fafc | Secondary bg — cool tint |
| `--muted` | `30 20% 95%` | `213 27% 96%` | #f1f5f9 | Muted areas — matches bg |
| `--muted-foreground` | `0 0% 40%` | `215 16% 47%` | #64748b | Muted text — slate gray |
| `--accent` | `22 83% 58%` | `213 27% 97%` | #f8fafc | Accent bg — cool neutral |
| `--accent-foreground` | `0 0% 100%` | `215 25% 27%` | #334155 | Accent text — dark slate |
| `--border` | `30 10% 90%` | `214 20% 88%` | #e2e8f0 | Borders — cool, slightly stronger |
| `--surface-0` | `30 40% 98%` | `213 27% 96%` | #f1f5f9 | Page base — matches bg |
| `--surface-3` | `30 20% 95%` | `210 20% 98%` | #f8fafc | Hover states — cool |
| `--surface-border` | `30 10% 90%` | `214 20% 88%` | #e2e8f0 | Borders — matches border |
| `--gray-medium` | `0 0% 40%` | `215 16% 47%` | #64748b | Medium gray — slate |
| `--gray-light` | `0 0% 55%` | `215 16% 57%` | #94a3b8 | Light gray — slate |
| `--gray-lighter` | `0 0% 90%` | `214 20% 88%` | #e2e8f0 | Lighter gray — cool |
| `--gray-lightest` | `0 0% 97%` | `210 20% 98%` | #f8fafc | Lightest gray — cool |
| `--tan-accent` | `30 8% 91%` | `214 15% 91%` | #e2e7ee | Tan accent — cool version |
| `--beige-light` | `30 14% 95%` | `213 20% 95%` | #eef2f7 | Beige light — cool version |

### Card Shadows

Add subtle cool-toned box shadows to cards. Currently cards have no shadows in light mode.

**New card shadow:** `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`

This needs to be applied via the `.dash-card` / card component styles, or as a base card class in globals.css. The shadow color uses slate-900 (`#0f172a`) at low opacity for a cool-toned shadow.

### Glass Card Effect

Update the light mode `.glass-card` background to use the cool palette:
- Current: `hsl(var(--card) / 0.7)` (already white-based, should work)
- No change needed — the CSS variable cascade handles this

### Sidebar Labels

Switch from all-orange section group labels to slate gray, keeping only the active nav item orange:

- **Group labels** (HOME, VETTING, GUILDS, etc.): Use `--muted-foreground` (slate `#94a3b8`)
- **Active nav item**: Orange text + orange left border + light orange background (`#fff7ed`)
- **Inactive nav items**: Slate text (`#475569`)

This is a component-level change in the sidebar/navigation component.

### Ambient Glows & Gradients

The `.hero-glow-orb` and `.content-gradient` effects use CSS variables and should cascade automatically. Verify they still look good against the cooler background after the token swap.

## What Does NOT Change

- **Dark mode** — completely unaffected, all changes are in `:root` only
- **Brand orange** (`--primary: 24 100% 51%`) — unchanged
- **Status colors** (positive, negative, warning, info) — unchanged
- **Rank colors** — unchanged
- **Card background** — stays pure white
- **Typography** — unchanged
- **Component structure** — no layout changes
- **`colors.ts` semantic tokens** — these reference CSS variables, so they cascade automatically

## Scope

- `src/app/globals.css` — CSS custom property updates in `:root` block + card shadow utility
- Sidebar navigation component — group label color change
- Verification pass across all 4 view types (expert, landing, candidate, company)

## Risk

Low. All changes flow through CSS custom properties, so the entire app updates from ~20 token changes in one file. The sidebar label change is the only component-level edit. Dark mode is untouched.
