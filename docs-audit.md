# Docs Bug Audit

## Critical (breaks rendering on most pages)

### 1. `.docs-prose` list styles bleed into custom components

**Files:** `src/app/globals.css:354-361`, `src/components/docs/DocsTldr.tsx:33`, `src/components/docs/DocsKeyTakeaways.tsx:33`, `src/components/docs/DocsComparison.tsx:92`

`.docs-prose ul` applies `list-style: disc; padding-left: 24px; margin: 20px 0` to ALL descendant `<ul>` elements. DocsTldr, DocsKeyTakeaways, and DocsComparison render `<ul>` with custom bullet styling (tiny `<span>` dots or icons). The prose CSS has higher specificity than Tailwind utilities in v4, so it overrides `pl-0`. Result: **double bullets** (disc marker + custom span dot) and **unwanted left padding** on nearly every page.

**Fix:** Scope to direct children (`.docs-prose > ul` / `.docs-prose > ol`) or add `list-style: none` to each component's `<ul>`.

---

### 2. `.docs-prose h3` styles bleed into DocsNextSteps and DocsCTA

**Files:** `src/app/globals.css:311-319`, `src/components/docs/DocsNextSteps.tsx:39/53`, `src/components/docs/DocsCTA.tsx:36`

`.docs-prose h3` applies `margin-top: 40px; font-size: 22px; font-weight: 600` to ALL descendant `<h3>`. DocsNextSteps and DocsCTA render `<h3>` for section/card titles. Inside prose, these get an extra 40px top margin and the wrong font-size (22px instead of intended 18px).

**Fix:** Scope to `.docs-prose > h3` or change component headings to `<p>` with appropriate role.

---

### 3. `.docs-prose h4` styles bleed into DocsStepList

**Files:** `src/app/globals.css:322-329`, `src/components/docs/DocsStepList.tsx:45`

`.docs-prose h4` applies `margin-top: 28px; margin-bottom: 8px` to all descendant `<h4>`. DocsStepList renders `<h4>` for each step title, so each step gets an unwanted 28px top margin pushing it away from the step number.

**Fix:** Scope to `.docs-prose > h4` or add explicit margin overrides to step `<h4>`.

---

### 4. `.docs-prose table` styles bleed into AlignmentTierTable

**Files:** `src/app/globals.css:413-420`, `src/components/docs/demos/AlignmentTierTable.tsx:57`

`.docs-prose table` applies `border: 1px solid; border-radius: 0.75rem; overflow: hidden; margin: 1.75rem 0`. AlignmentTierTable already has its own wrapper `<div>` with `overflow-hidden rounded-xl border border-border`, creating **double borders**.

**Fix:** Add a `.custom-table` exception or scope the prose table rule.

---

### 5. `.docs-prose table` issues on governance page

**Files:** `src/app/globals.css:413-420`, `src/app/docs/experts/governance/page.tsx:226-261`

The governance page renders a raw `<table>` inside prose with no wrapper. The `border-radius: 0.75rem` + `border-collapse: collapse` combination produces clipped/misaligned borders in some browsers.

**Fix:** Wrap in `<div className="overflow-hidden rounded-xl">` and remove border-radius from the prose table rule.

---

### 6. Invalid HTML nesting in DocsStepList

**File:** `src/components/docs/DocsStepList.tsx:26-31`

Renders `<li>` inside `<div role="list">`. `<li>` is only valid as a direct child of `<ul>`, `<ol>`, or `<menu>`. Browsers may produce validation warnings and screen readers may behave unpredictably.

**Fix:** Change to `<ul role="list" className="list-none">` or change `<li>` to `<div role="listitem">`.

---

### 7. `.docs-prose li` styling bleeds into DocsTldr and DocsKeyTakeaways

**Files:** `src/app/globals.css:365-371`, `src/components/docs/DocsTldr.tsx:34-35`, `src/components/docs/DocsKeyTakeaways.tsx:34-35`

`.docs-prose li` applies `margin: 10px 0; padding-left: 6px` and `.docs-prose li::marker` colors the marker. These components use `<li>` with custom flex-based bullet rendering. The prose padding-left pushes content rightward and marker color applies to the (now-visible due to Bug 1) disc markers.

**Fix:** Same as Bug 1 — scope to direct children.

---

### 8. `.docs-prose p` margin bleeds into DocsCallout and DocsStepList

**Files:** `src/app/globals.css:331-333`, `src/components/docs/DocsCallout.tsx:76`, `src/components/docs/DocsStepList.tsx:49`

`.docs-prose p { margin: 16px 0; }` applies to all `<p>` inside prose. DocsCallout tries to counter with `[&>p]:my-1.5` but prose CSS has higher specificity (`0,1,1` vs `0,1,0`), so the override fails. Creates extra vertical spacing inside callouts and step descriptions.

**Fix:** Scope prose `p` margin to direct children or increase specificity on component overrides.

---

## Recommended batch fix for Bugs 1-5, 7-8

Scope ALL `.docs-prose` element rules to direct children:

```css
.docs-prose > h2 { ... }
.docs-prose > h3 { ... }
.docs-prose > h4 { ... }
.docs-prose > p  { ... }
.docs-prose > ul { ... }
.docs-prose > ol { ... }
.docs-prose > li { ... }
.docs-prose > table { ... }
```

This fixes 7 of 8 critical bugs in one pass.

---

## Visual Issues

### V1. Scroll-spy rootMargin doesn't match header height

**File:** `src/components/docs/DocsOnThisPage.tsx:44`

`rootMargin: "-80px 0px -66% 0px"` assumes 80px header. Actual header is 116px (60+44+12 gap). Headings get highlighted while still behind the header.

**Fix:** Change to `rootMargin: "-116px 0px -66% 0px"`.

---

### V2. SVG uses "Satoshi" font not loaded in project

**File:** `src/components/docs/DocsSwimlane.tsx:43,134,143,199`

SVG `<text>` elements use `fontFamily="Satoshi, system-ui, sans-serif"`. Project uses Inter, Bree Serif, Bricolage Grotesque. Will fall back to system-ui, looking inconsistent.

**Fix:** Change to `fontFamily="'Inter', system-ui, sans-serif"`.

---

### V3. Glossary scroll-mt too small

**File:** `src/app/docs/glossary/page.tsx` (TermList component)

Glossary term anchors use `scroll-mt-20` (80px) but the header is 128px. Terms scroll to a position partially hidden behind the header.

**Fix:** Change to `scroll-mt-[128px]`.

---

### V4. Double eyebrow + breadcrumb on all content pages

**Files:** All pages using `<DocsPage eyebrow="...">`

Every page shows both a breadcrumb (`Docs > For experts > Page name`) and an eyebrow (`For experts . Core concept`). The section name appears in both, which is redundant.

---

### V5. DocsCallout backgrounds may be invisible in dark mode

**File:** `src/components/docs/DocsCallout.tsx:28-55`

Backgrounds use `bg-info-blue/[0.07]`, `bg-positive/[0.07]`, etc. At 7% opacity on dark backgrounds these are nearly invisible. The `ring-1` border provides some distinction but the tint is the primary visual signal.

---

### V6. DocsNextSteps cover gradient faded in dark mode

**File:** `src/components/docs/DocsNextSteps.tsx:74`

`dark:from-primary/[0.14] dark:via-primary/[0.06]` — at 14% opacity of primary orange on dark, the gradient may be barely visible.

---

### V7. CommitRevealDemo uses simplified math vs actual system

**File:** `src/components/docs/demos/CommitRevealDemo.tsx:67-75`

Demo uses absolute distance from median with fixed thresholds (5, 10, 15). Actual system uses IQR-based distances. Could confuse users trying to reverse-engineer the real slashing math.

---

### V8. Glossary jump-links get prose link styling

**File:** `src/app/docs/glossary/page.tsx:184-208`

Jump-to-section `<a>` tags inside prose get `.docs-prose a` styling (orange + font-weight 500), overriding the intended `text-foreground` class.

---

## Navigation & Layout

### N1. No "Back to app" on mobile (CRITICAL)

**File:** `src/components/docs/DocsTopBar.tsx:106`

The "Back to app" link lives in Row 2 of the header, which is hidden on mobile (`hidden ... md:flex`). Mobile users have **no way to navigate back to the main app** except editing the URL manually.

**Fix:** Add a "Back to app" link inside `DocsSidebar.tsx` (visible on mobile), or move it to Row 1 of the top bar.

---

### N2. "Back to app" link missing prefetch

**File:** `src/components/docs/DocsTopBar.tsx:158`

The link uses `<Link href="/">` with no explicit `prefetch` prop. Since it's a small text link in the top-right corner of Row 2, it may not get aggressively prefetched by Next.js. Navigating to `/` unmounts the entire docs layout and mounts the main app, causing perceived slowness.

**Fix:** Add `prefetch={true}` to force eager prefetch of the root page RSC payload.

---

### N3. Two-row header consumes 104px of vertical space

**File:** `src/components/docs/DocsTopBar.tsx:46,106`

Row 1 = 60px, Row 2 = 44px = 104px total sticky header. On a 900px laptop screen that's 11.5% of the viewport. Stripe Docs uses ~52px, Docusaurus ~60px, Tailwind ~64px — all single-row.

**Options:**
- Collapse to single row — merge persona tabs into a dropdown or small pills next to the logo
- Make Row 2 scroll-collapsible (hide on scroll-down, reveal on scroll-up — GitBook does this)
- Move persona switching into the sidebar entirely (Docusaurus pattern)

---

### N4. Sidebar section headers too low contrast

**File:** `src/components/docs/DocsSidebar.tsx:102`

Section headers like "GETTING STARTED" and "REFERENCE" use `text-muted-foreground/80` — grey at 80% opacity. These are structurally the most important navigational landmarks but are visually the weakest element. The links below them (which use full `text-muted-foreground` at line 118) are actually *more* visible than their parent headers.

**Fix:** Change to `text-primary` or `text-primary/70` for orange section headers — creates clear visual breaks. This is what GitBook, Docusaurus, and Stripe all do.

```diff
- <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
+ <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/70">
```

---

### N5. Inactive sidebar links too faded

**File:** `src/components/docs/DocsSidebar.tsx:118`

All non-active links use `text-muted-foreground`, creating a flat, low-contrast list. Combined with N4, the entire sidebar is a wall of grey.

**Fix:**
- Change inactive links to `text-foreground/70` for better readability
- Add a left-border accent on the active link: `border-l-2 border-primary bg-primary/5`
- Consider adding section icons (already defined in `docs-nav.ts` but never rendered — see CQ11)

---

### N6. Section icons defined but never rendered

**Files:** `src/components/docs/docs-nav.ts:28`, `src/components/docs/DocsSidebar.tsx:91-133`

Each `DocsNavSection` has an `icon` property but `SectionBlock` never renders it. The icons could improve scannability — show them next to section headers.

---

### N7. No collapsible sidebar sections (half-implemented)

**Files:** `src/components/docs/docs-nav.ts:29` (type), `src/components/docs/DocsSidebar.tsx`

`DocsNavSection` defines `defaultCollapsed?: boolean` but no section sets it and the sidebar never reads it. The Expert persona has 4 sub-groups — collapsibility would keep the sidebar manageable. This is a standard feature in GitBook, Docusaurus, and Nextra.

---

### N8. Table of contents only visible at xl (1280px+)

**File:** `src/components/docs/DocsPage.tsx:67`

The "On this page" right rail is hidden below `xl` (`hidden ... xl:block`). Most laptop users at 1024-1279px lose the TOC entirely. Docusaurus, Tailwind, and GitBook all show it from `lg` (1024px).

**Fix:** Show a narrower TOC from `lg`: `hidden lg:block lg:w-[180px] xl:w-[224px]`.

---

### N9. Prev/next navigation defaults to off

**File:** `src/components/docs/DocsPage.tsx:47`

`showPrevNext` defaults to `false`. Most pages lack bottom navigation, breaking linear reading flow. GitBook, Docusaurus, and Stripe all default this ON.

**Fix:** Change default to `true` — let pages opt OUT instead.

---

### N10. Prev/next crosses persona boundaries

**File:** `src/components/docs/docs-nav.ts:137`

`docsFlatOrder` flattens ALL sections into a single list regardless of persona. The prev/next pagination could jump from an expert page to a candidate page, which is confusing.

**Fix:** Filter `docsFlatOrder` by current persona when computing adjacent pages.

---

### N11. "Reference" link is an inconsistent navigation pattern

**File:** `src/components/docs/DocsTopBar.tsx:138-154`

"Reference" in Row 2 sits next to persona tabs (Experts/Candidates/Companies) but behaves differently — it navigates to `/docs/glossary` instead of switching the sidebar scope. Users expect it to act like the persona tabs.

**Fix:** Either make it a proper persona scope or move it into the sidebar as a section.

---

## Search Improvements

### S1. Search only indexes page titles

**File:** `src/components/docs/DocsSearchPalette.tsx:22-28`

Searching for "IQR" or "slashing penalty" returns nothing even though those terms appear on multiple pages. The `searchable` field is just `"${item.label} ${section.label}"`. For a 26-page docs site this is a significant discovery gap.

**Fix (short-term):** Add keywords to each `DocsNavItem` and include them in `searchable`.
**Fix (long-term):** Generate a static search index at build time with page body content. Docusaurus and Nextra both do this.

---

### S2. No search in the sidebar

**Files:** `src/components/docs/DocsSidebar.tsx`, `src/components/docs/DocsChrome.tsx`

Every major docs site (GitBook, Docusaurus, Stripe, Tailwind) puts a search input at the top of the sidebar. Users scanning the sidebar expect to find search there. Currently search is only in the top bar, which means mobile users must close the drawer to search.

**Fix:** Add a compact search trigger at the top of `DocsSidebar.tsx` that opens the same palette.

---

### S3. No fuzzy matching

**File:** `src/components/docs/DocsSearchPalette.tsx:34`

Uses `String.includes()` — a typo like "endrsement" or abbreviation like "rep ranks" returns zero results.

**Fix:** Add Fuse.js (~4KB gzipped) for typo tolerance and weighted scoring.

---

### S4. Search results capped at 12 with no indication

**File:** `src/components/docs/DocsSearchPalette.tsx:33-34`

`.slice(0, 12)` silently truncates results. Users get no indication more results exist.

**Fix:** Show "12 of N results" in the footer (the footer already renders `results.length`).

---

### S5. Search clamping effect fragile with 0 results

**File:** `src/components/docs/DocsSearchPalette.tsx:61-63`

```tsx
useEffect(() => {
  if (activeIndex >= results.length) setActiveIndex(0);
}, [results.length, activeIndex]);
```

When `results.length` is 0, `0 >= 0` is true → `setActiveIndex(0)` → React bails out (same value). Works by accident. A safer guard:

```tsx
if (results.length > 0 && activeIndex >= results.length) setActiveIndex(0);
```

---

## Accessibility

### A1. Broken `aria-controls` reference

**File:** `src/components/docs/DocsTopBar.tsx:52`

Hamburger button has `aria-controls="docs-sidebar"` but no element has `id="docs-sidebar"`.

**Fix:** Add `id="docs-sidebar"` to the mobile drawer `<aside>` in `DocsChrome.tsx:142`.

---

### A2. Mobile drawer lacks focus trap

**File:** `src/components/docs/DocsChrome.tsx:125-155`

The drawer has `role="dialog"` and `aria-modal="true"` but no focus trap. Tab key moves focus out of the drawer into content behind it. WCAG violation for modal dialogs.

**Fix:** Use a focus-trap library or manually manage focus (trap Tab/Shift+Tab within the drawer).

---

### A3. Duplicate `aria-label="Docs navigation"`

**Files:** `src/components/docs/DocsChrome.tsx:97`, `src/components/docs/DocsSidebar.tsx:52`

Both the `<aside>` and its child `<nav>` have `aria-label="Docs navigation"`. The mobile drawer also gets the same label. Screen readers announce three landmarks with identical names.

**Fix:** Remove `aria-label` from the `<aside>` wrappers. The `<nav>` label is sufficient.

---

### A4. Mobile drawer top offset doesn't match header height

**Files:** `src/components/docs/DocsChrome.tsx:137,147`

Both the overlay and drawer use `top-14` (56px), but the header is 60px (`h-[60px]`) + 1px mobile border (`DocsTopBar.tsx:168`). The drawer overlaps the bottom 5px of the header.

**Fix:** Change to `top-[61px]`.

---

## UX Improvements

### U1. No dark mode toggle visible in docs

**File:** `src/components/docs/DocsTopBar.tsx`

The app has a `ThemeProvider` but the docs chrome exposes no light/dark toggle. Users reading docs at night have no way to switch without going back to the app. GitBook and Docusaurus both put this in the header.

---

### U2. No "Edit this page" link

**File:** `src/components/docs/DocsPage.tsx`

Stripe, Docusaurus, and GitBook all provide a link to the source file on GitHub. Standard for community-facing docs.

---

### U3. Feedback widget has no backend

**File:** `src/components/docs/DocsFeedback.tsx`

"Was this helpful?" widget stores state in `useState` only. Clicking Yes/No shows acknowledgment but the signal is never persisted. Misleading UX.

---

### U4. Mobile sidebar incomplete for shared pages

**File:** `src/components/docs/DocsSidebar.tsx:29-36`

When viewing "Getting started" pages, persona detection falls to `"shared"`. Mobile sidebar shows only 5 items with no way to navigate to expert/candidate/company pages without the persona switcher.

---

## Code Quality

| # | File | Issue |
|---|------|-------|
| CQ1 | `src/app/docs/candidates/page.tsx:2` | Unused import: `Link` from next/link |
| CQ2 | `src/app/docs/companies/page.tsx:2` | Unused import: `Link` from next/link |
| CQ3 | `src/app/docs/candidates/page.tsx:4` | Unused import: `ArrowRight` from lucide-react |
| CQ4 | `src/app/docs/companies/page.tsx:4,9` | Unused imports: `ArrowRight`, `FileText` |
| CQ5 | `src/app/docs/candidates/quickstart/page.tsx:2` | Unused imports: `Mail`, `Linkedin` |
| CQ6 | `src/app/docs/page.tsx:6` | `BookOpen` imported only for type annotation |
| CQ7 | `src/components/docs/DocsChrome.tsx:99-100` | Dead `top-14` class (sidebar is `hidden md:block`) |
| CQ8 | `src/components/docs/DocsSearchPalette.tsx:67-96` | Keyboard listener re-binds on every `activeIndex` change |
| CQ9 | Multiple pages | App-link hrefs (`/auth/login?type=expert`, etc.) duplicated everywhere — should be constants |
| CQ10 | All DocsPage usages | Breadcrumb + eyebrow both contain section name |
| CQ11 | `src/components/docs/docs-nav.ts` / `DocsSidebar.tsx` | Section `icon` property defined but never rendered |
| CQ12 | `src/components/docs/docs-nav.ts:29` | `defaultCollapsed` type field defined but never used by any section or component |
| CQ13 | `src/components/docs/DocsChrome.tsx:84` | `PatternBackground` uses `!opacity-[0.45]` — important override instead of a component prop |
| CQ14 | `DocsChrome.tsx:42-51` + `DocsSearchPalette.tsx:99-109` | Duplicate body scroll lock logic — should be a shared `useBodyScrollLock` hook |

---

## Priority Summary

### Do first (critical / high impact, low effort)

| # | Issue | Effort |
|---|-------|--------|
| N1 | Add "Back to app" on mobile | 10 min |
| N4 | Section headers → `text-primary/70` | 1 line |
| N5 | Inactive links → `text-foreground/70` + active border | 5 min |
| N9 | Default `showPrevNext` to `true` | 1 line |
| A1 | Add `id="docs-sidebar"` to drawer | 1 line |
| A4 | Fix drawer top offset → `top-[61px]` | 1 line |
| V1 | Fix scroll-spy rootMargin → `-116px` | 1 line |
| V2 | SVG font → `Inter` | 4 lines |
| Batch | Scope all `.docs-prose` rules to `>` children | 30 min |

### Do next (medium impact)

| # | Issue | Effort |
|---|-------|--------|
| N2 | Add `prefetch={true}` to "Back to app" | 1 line |
| N8 | Lower TOC breakpoint to `lg` | 5 min |
| S2 | Add search trigger in sidebar | 30 min |
| S5 | Fix search clamping guard | 1 line |
| A2 | Add focus trap to mobile drawer | 1 hr |
| A3 | Remove duplicate aria-labels | 5 min |
| N7 | Implement collapsible sidebar sections | 2 hr |
| N6 | Render section icons in sidebar | 30 min |
| CQ14 | Extract shared `useBodyScrollLock` hook | 30 min |

### Later (valuable but lower urgency)

| # | Issue | Effort |
|---|-------|--------|
| N3 | Collapse header to 1 row or make Row 2 scroll-collapsible | 2-4 hr |
| S1 | Full-text search index | 4 hr |
| S3 | Fuzzy matching (Fuse.js) | 1 hr |
| U1 | Dark mode toggle in docs header | 30 min |
| U2 | "Edit this page" link | 30 min |
| U3 | Wire feedback widget to backend | 1-2 hr |
| N10 | Persona-scoped prev/next | 1 hr |
| N11 | Rethink "Reference" tab pattern | 1 hr |

---

## Improvements

### Reading Experience

#### I1. Add reading time estimate to page headers

**File:** `src/components/docs/DocsPageHeader.tsx`

Show "~3 min read" next to `lastUpdated`. Calculate from word count at build time (average 200 wpm). Helps users decide whether to read now or bookmark. Stripe, Docusaurus, and Medium all do this.

**Implementation:** Add a `readingTime` prop to `DocsPage` → `DocsPageHeader`. Compute in each `page.tsx` or (better) auto-calculate from children via a small utility that counts text nodes.

---

#### I2. Add anchor links on hover for headings

**File:** `src/app/globals.css` (`.docs-prose` heading rules)

When hovering over an `<h2>` or `<h3>` inside prose, show a subtle `#` link icon. Users can then right-click → copy link to share a deep link to a specific section. Standard in GitHub, Docusaurus, MDN.

**Implementation:** CSS-only approach using `::before` pseudo-element on headings with an `id`, or a small `DocsAnchorHeading` component.

---

#### I3. Add "copy link to section" on TOC items

**File:** `src/components/docs/DocsOnThisPage.tsx:65-76`

Right-clicking a TOC link copies the anchor URL — but a one-click "copy" icon on hover would make sharing specific sections frictionless.

---

#### I4. Synced tab groups across the page

**File:** `src/components/docs/DocsTabs.tsx`

Currently each `DocsTabs` instance manages its own `activeIndex`. If a page has multiple tab groups with the same labels (e.g., "MetaMask" / "Coinbase Wallet"), selecting one should sync all of them — so the user picks their wallet once and all examples switch. Docusaurus calls this "synced tab groups."

**Implementation:** Add an optional `groupId` prop. Use a React context or `localStorage` key to sync all tab groups with the same `groupId`.

---

#### I5. Glossary tooltip on hover

**File:** `src/components/docs/DocsGlossaryLink.tsx`

Currently `DocsGlossaryLink` navigates to `/docs/glossary#term` on click. A better UX: show an inline tooltip with the term definition on hover, and only navigate on click. This keeps users in-context. Stripe and Notion docs both do this.

**Implementation:** Fetch glossary definitions at build time into a constant map. Use a Radix `Tooltip` or `HoverCard` to display the short definition inline.

---

#### I6. Expandable code blocks for long snippets

**File:** `src/components/docs/DocsCodeBlock.tsx`

For code blocks over ~15 lines, collapse to a preview with "Show more" button. Prevents long code snippets from dominating the page and pushing prose out of view.

---

### Navigation & Discovery

#### I7. Add breadcrumb "Back to app" on mobile

**Files:** `src/components/docs/DocsBreadcrumb.tsx`, `src/components/docs/DocsSidebar.tsx`

Beyond the N1 fix (adding a link), consider adding a prominent "Back to Vetted" entry at the top of the mobile sidebar with a distinct style (e.g., a full-width button with arrow-left icon), plus keeping the breadcrumb trail's first item as a link back to `/`.

---

#### I8. Add a "What's new" / changelog section

**File:** New route at `src/app/docs/changelog/page.tsx`

Currently there's no way for users to know what changed in the docs or the platform. A changelog page (or section) with dated entries would:
- Surface new features to returning users
- Give the `isNew` badge on nav items more context (link to the changelog entry)
- Show the platform is actively maintained

---

#### I9. Add persona-aware landing when arriving from the app

**File:** `src/app/docs/page.tsx`

When a user clicks a `HelpLink` from the expert dashboard, they land on the docs homepage and must find their way. Use the `?from=` query param (already passed by `HelpLink`) to auto-scroll to the relevant persona card or pre-select the persona tab.

---

#### I10. Add "Related pages" at the bottom of each page

**File:** `src/components/docs/DocsPage.tsx`

After `DocsFeedback`, show 2-3 contextually related pages. More targeted than generic prev/next. Could be manually curated per page (a `relatedPages` prop) or auto-derived from shared glossary terms.

---

#### I11. Sidebar section progress indicators

**File:** `src/components/docs/DocsSidebar.tsx`

For multi-page guides (e.g., Expert quickstart → Applying → Reviewing → Voting), show a subtle progress bar or checkmark on visited pages. Use `localStorage` to track which pages the user has read. Helps users see how far through a section they are.

---

### Visual & Design Polish

#### I12. Active sidebar link needs stronger visual weight

**File:** `src/components/docs/DocsSidebar.tsx:114-119`

Currently: `font-semibold text-primary` — orange text only. No background, no border. Easy to miss when scanning a sidebar with many items.

**Improvement:** Add a left-border accent + subtle background:
```tsx
isActive
  ? "font-semibold text-primary bg-primary/5 border-l-2 border-primary"
  : "font-normal text-foreground/70 border-l-2 border-transparent hover:text-foreground hover:border-border"
```

---

#### I13. Callout backgrounds need higher opacity in dark mode

**File:** `src/components/docs/DocsCallout.tsx:28-55`

At `bg-info-blue/[0.07]` the tint is nearly invisible on dark backgrounds. Bump to `/[0.12]` in dark mode or use a `dark:` variant for each kind.

```diff
- card: "bg-info-blue/[0.07] ring-info-blue/25",
+ card: "bg-info-blue/[0.07] dark:bg-info-blue/[0.12] ring-info-blue/25",
```

---

#### I14. Add smooth scroll behavior for anchor links

**File:** `src/app/globals.css` or `src/app/docs/layout.tsx`

Clicking TOC links or glossary anchors jumps instantly. Adding `scroll-behavior: smooth` (scoped to docs pages) makes the transition feel polished. Respect `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: no-preference) {
  .docs-chrome { scroll-behavior: smooth; }
}
```

---

#### I15. Add subtle page transition animation

**File:** `src/components/docs/DocsChrome.tsx` or `DocsPage.tsx`

When navigating between docs pages, the content swaps instantly with no visual transition. A subtle fade-in (150ms opacity transition on the `<article>`) would make navigation feel smoother. Don't over-animate — just enough to avoid the visual "pop."

---

#### I16. Landing page persona cards — add hover preview

**File:** `src/components/docs/DocsPersonaCard.tsx`

The persona cards on `/docs` show a description and a link. On hover, show a preview of the top 3-4 pages in that persona's section (pulled from `docsNav`). Gives users a quick sense of what's inside before committing to a persona.

---

### Search & Discovery

#### I17. Add recent searches / recently visited pages

**File:** `src/components/docs/DocsSearchPalette.tsx`

When the search palette opens with an empty query, show "Recent" (pages the user visited recently, from `localStorage`) instead of all pages. Helps power users navigate quickly. GitBook and Algolia DocSearch both do this.

---

#### I18. Group search results by section

**File:** `src/components/docs/DocsSearchPalette.tsx:154-191`

Currently results render as a flat list. Group them under section headers (e.g., "Core workflows", "Economics") for visual hierarchy. The `section` field already exists on each `FlatItem`.

---

#### I19. Add keywords to nav items for better search hits

**File:** `src/components/docs/docs-nav.ts`

Add a `keywords` field to `DocsNavItem`:
```ts
{ label: "Commit-reveal voting", href: "...", keywords: ["blind", "IQR", "consensus", "nonce"] }
```

Include keywords in the `searchable` string. Low-effort way to dramatically improve search without full-text indexing.

---

### Content Gaps

#### I20. Missing: API reference / integration guide

No docs for developers integrating with Vetted's API or smart contracts. If the platform has a public API, a dedicated reference section with endpoints, request/response examples, and auth would be valuable.

---

#### I21. Missing: Troubleshooting / common errors page

No dedicated troubleshooting page for common issues (wallet connection failures, transaction reverts, "why was I slashed?"). The FAQ partially covers this but a dedicated troubleshooting guide with error codes would reduce support load.

---

#### I22. Missing: Visual diagrams on key concept pages

Some concept pages (reputation, slashing, earnings) would benefit from visual diagrams showing formulas, token flows, or state machines. The `DocsFlowDiagram` and `DocsSwimlane` components exist but are only used on a few pages. More visual explanations = fewer confused users.

---

### Performance

#### I23. Lazy-load DocsSearchPalette

**File:** `src/components/docs/DocsChrome.tsx:9`

`DocsSearchPalette` is statically imported but only shown on user action. Use `React.lazy` + `Suspense` to keep it out of the initial bundle.

```tsx
const DocsSearchPalette = lazy(() =>
  import("./DocsSearchPalette").then(m => ({ default: m.DocsSearchPalette }))
);
```

---

#### I24. Remove PatternBackground `!important` override

**File:** `src/components/docs/DocsChrome.tsx:84`

`!opacity-[0.45]` fights the component's own defaults. Add an `opacity` or `intensity` prop to `PatternBackground` instead. Also consider whether the fixed decorative layer is worth the GPU compositing cost on lower-end devices.

---

## Improvement Priority Summary

### Quick wins (high impact, < 30 min each)

| # | Improvement | Why |
|---|-------------|-----|
| I12 | Active sidebar link border + background | Scannability — the single biggest sidebar readability win after N4/N5 |
| I13 | Callout dark mode opacity bump | Invisible callouts defeat their purpose |
| I14 | Smooth scroll for anchor links | 2 lines of CSS, immediate feel improvement |
| I19 | Add keywords to nav items | Dramatically better search without infra changes |
| I23 | Lazy-load search palette | Smaller initial bundle, zero UX cost |

### Medium effort (1-4 hours)

| # | Improvement | Why |
|---|-------------|-----|
| I1 | Reading time estimates | Sets expectations, easy build-time compute |
| I2 | Anchor links on heading hover | Standard feature, easy CSS/component addition |
| I5 | Glossary tooltip on hover | Keeps users in-context, uses existing Radix primitives |
| I8 | Changelog page | Shows momentum, gives `isNew` badges meaning |
| I17 | Recent searches in palette | Power-user speed, uses localStorage |
| I18 | Group search results by section | Better visual hierarchy, data already exists |

### Larger investments (4+ hours)

| # | Improvement | Why |
|---|-------------|-----|
| I4 | Synced tab groups | Important for multi-wallet / multi-persona content |
| I10 | Related pages | Keeps users reading, reduces bounce |
| I11 | Sidebar progress indicators | Gamifies learning path, increases completion |
| I20 | API reference section | Essential if the platform has public APIs |
| I21 | Troubleshooting guide | Directly reduces support volume |
