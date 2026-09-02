# Work Page Client Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Category / Client" mode toggle to `/work` so visitors can filter the project grid by client (single-select) as well as by category (existing multi-select), per `docs/superpowers/specs/2026-08-11-work-page-client-filter-design.md`.

**Architecture:** All changes live in `src/pages/WorkPage.tsx` (state + markup) and `src/index.css` (new rules alongside the existing `.work-page__*` block). No new files, no changes to `src/data/work.ts` — `Project.client` already exists.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4 (utility classes only where already used) + Framer Motion (`Reveal` component, unchanged). No test framework in this repo — verification is `npx tsc -b` + `npm run lint` (oxlint) + live checks via the Claude Browser preview tools, matching how every other change in this codebase is verified.

## Global Constraints

- Quote the project root path in every shell command — it contains a space (`/Volumes/ups tl/02 pixelwave/00_pixel/000_sito`).
- Every commit uses explicit file pathspecs (`git add <exact files>`), never `git add -A`/`git add .` — the working tree carries unrelated pre-existing uncommitted files that must never be swept into these commits.
- Run `npx tsc -b && npm run lint` after every code change, before every commit. Both must be clean.
- No unit test framework exists — "tests" in this plan are `tsc`/`lint` plus explicit live-browser assertions via the Claude Browser tools (`preview_start`, `navigate`, `javascript_tool`, `computer` screenshot). Every task's verification step gives the exact JS/commands to run and the exact expected output — treat these as required, not optional.
- Match existing code style: no comments explaining *what* code does, only non-obvious *why* (see e.g. the existing `// "Featured" is a highlight badge...` comment in `WorkPage.tsx`).

---

### Task 1: Mode state + client filter logic (no new UI yet)

**Files:**
- Modify: `src/pages/WorkPage.tsx:1-31` (imports, `FILTER_TAGS`, and the start of `WorkPage`)

**Interfaces:**
- Consumes: `PROJECTS` from `@/data/work` (existing, unmodified — each `Project` has `client: string`, already present).
- Produces: `FILTER_CLIENTS: string[]`, `mode: "category" | "client"` state + `setMode`, `activeClient: string | null` state, `selectClient(client: string): void`, and a `visibleProjects` that branches on `mode` — all consumed by Task 2's new markup.

This task changes only the data-derivation and state/filtering logic inside `WorkPage.tsx`. It intentionally does **not** touch the JSX yet, so the page's visible behavior is identical to before — the verification step below is a regression check (existing category filter still works) proving the refactor didn't break anything, before Task 2 adds the new UI on top.

- [ ] **Step 1: Read the current file to confirm line numbers match**

Run: `sed -n '1,32p' "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito/src/pages/WorkPage.tsx"`

Expected output (exact, confirms nothing has drifted since this plan was written):

```tsx
import { useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { PROJECTS } from "@/data/work"

// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")

export function WorkPage() {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Empty selection shows everything; otherwise OR-match any selected tag.
  const visibleProjects = useMemo(() => {
    if (activeTags.size === 0) return PROJECTS
    return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
  }, [activeTags])

  return (
```

If this doesn't match exactly, stop and re-read the full file before continuing — later steps assume this exact starting content.

- [ ] **Step 2: Add `FILTER_CLIENTS` next to `FILTER_TAGS`**

In `src/pages/WorkPage.tsx`, replace:

```tsx
// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")
```

with:

```tsx
// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")

// Alphabetical (unlike FILTER_TAGS' insertion order) — categories are a
// small curated set where order doesn't matter; clients are the dimension
// expected to grow, so alphabetical keeps a long list scannable.
const FILTER_CLIENTS = Array.from(new Set(PROJECTS.map((p) => p.client))).sort()
```

- [ ] **Step 3: Replace the single-mode state/logic with mode-aware state/logic**

Replace:

```tsx
export function WorkPage() {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Empty selection shows everything; otherwise OR-match any selected tag.
  const visibleProjects = useMemo(() => {
    if (activeTags.size === 0) return PROJECTS
    return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
  }, [activeTags])
```

with:

```tsx
export function WorkPage() {
  const [mode, setMode] = useState<"category" | "client">("category")
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeClient, setActiveClient] = useState<string | null>(null)

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Single-select: picking a client is a lookup ("show me X's work"), not a
  // facet you stack with other clients — clicking the active one clears it.
  function selectClient(client: string) {
    setActiveClient((prev) => (prev === client ? null : client))
  }

  // Each mode keeps its own selection independently — switching tabs never
  // clears the other dimension's picks, only the active mode's selection
  // actually drives the grid below.
  const visibleProjects = useMemo(() => {
    if (mode === "category") {
      if (activeTags.size === 0) return PROJECTS
      return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
    }
    if (!activeClient) return PROJECTS
    return PROJECTS.filter((p) => p.client === activeClient)
  }, [mode, activeTags, activeClient])
```

- [ ] **Step 4: Verify TypeScript and lint are clean**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint
```
Expected: both commands exit with no errors. `tsc -b` will fail here if `FILTER_CLIENTS`, `mode`, or `selectClient` are unused — that's expected and fixed by Task 2, which is the next task in this plan. If it fails for any other reason (typo, wrong type), fix before continuing.

Note: TypeScript's `noUnusedLocals`-style checks (if enabled in this project's `tsconfig`) may flag `FILTER_CLIENTS`/`mode`/`activeClient`/`selectClient` as unused since the JSX doesn't reference them yet. If so, that's fine — Task 2 consumes all four immediately after. Confirm by checking `tsc -b`'s exact error: it should name only those four identifiers as unused, nothing else. If it names anything else, stop and investigate before continuing.

- [ ] **Step 5: Regression-check the existing category filter still works, live**

Ensure the dev server is running and open it in the Browser pane:

```
mcp__Claude_Browser__preview_start { "name": "pixellwave-dev" }
```
(If a server is already running per `preview_list`, reuse it — `navigate` to `http://localhost:5173/work` instead of starting a new one.)

```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/work" }
```

Then run this via `mcp__Claude_Browser__javascript_tool`:

```js
(function() {
  const webBtn = Array.from(document.querySelectorAll('.work-page__filter')).find(b => b.textContent === 'Web');
  webBtn.click();
  const grid = document.querySelector('.work-grid');
  const titles = Array.from(grid.querySelectorAll('.pw-card__title')).map(t => t.textContent);
  return JSON.stringify({ isActive: webBtn.classList.contains('is-active'), titles });
})();
```

Expected: `isActive: true`, and `titles` contains only projects tagged `Web` in `src/data/work.ts` (Northwind, Solstice, Meridian Bank, Nightfall Records, Arclight Studios — cross-check against the file's current `tags` arrays if the roster has changed since this plan was written). This confirms the mode-aware `visibleProjects` branch still filters by category correctly with `mode` defaulted to `"category"`.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git add src/pages/WorkPage.tsx && git commit -m "$(cat <<'EOF'
Add client filter state and mode-aware filtering logic to WorkPage

Category filtering is unchanged (still the default mode); this adds
FILTER_CLIENTS, activeClient, and a mode switch that visibleProjects
branches on. No new UI yet — the mode toggle and client pill row
land in the next commit.
EOF
)"
```

---

### Task 2: Mode toggle UI + client pill row + styling

**Files:**
- Modify: `src/pages/WorkPage.tsx` (the `work-page__head` JSX block, inside the `return`)
- Modify: `src/index.css:891` (add new rules immediately after the existing `.work-page__filters`/`.work-page__filter` block, i.e. after line 897 as currently numbered)

**Interfaces:**
- Consumes: `mode`, `setMode`, `activeTags`, `toggleTag`, `activeClient`, `selectClient`, `FILTER_TAGS`, `FILTER_CLIENTS` — all produced by Task 1.
- Produces: the full visible feature. Nothing downstream depends on this task.

- [ ] **Step 1: Replace the `work-page__head` JSX**

In `src/pages/WorkPage.tsx`, find:

```tsx
            <div className="work-page__head">
              <Reveal delay={0.1}>
                <p className="lead">All projects.</p>
              </Reveal>
              <Reveal delay={0.15} className="work-page__filters">
                {FILTER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`work-page__filter ${activeTags.has(tag) ? "is-active" : ""}`}
                    aria-pressed={activeTags.has(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </Reveal>
            </div>
```

Replace it with:

```tsx
            <div className="work-page__head">
              <Reveal delay={0.1}>
                <p className="lead">All projects.</p>
              </Reveal>
              <Reveal delay={0.15} className="work-page__filter-block">
                <div className="work-page__mode-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "category"}
                    className={`work-page__mode-tab ${mode === "category" ? "is-active" : ""}`}
                    onClick={() => setMode("category")}
                  >
                    Category
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "client"}
                    className={`work-page__mode-tab ${mode === "client" ? "is-active" : ""}`}
                    onClick={() => setMode("client")}
                  >
                    Client
                  </button>
                </div>

                {mode === "category" ? (
                  <div className="work-page__filters">
                    {FILTER_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`work-page__filter ${activeTags.has(tag) ? "is-active" : ""}`}
                        aria-pressed={activeTags.has(tag)}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="work-page__filters">
                    {FILTER_CLIENTS.map((client) => (
                      <button
                        key={client}
                        type="button"
                        className={`work-page__filter ${activeClient === client ? "is-active" : ""}`}
                        aria-pressed={activeClient === client}
                        onClick={() => selectClient(client)}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                )}
              </Reveal>
            </div>
```

- [ ] **Step 2: Add the new CSS rules**

In `src/index.css`, find the existing block:

```css
.work-page__filters { display: flex; flex-wrap: wrap; gap: clamp(1.25rem, 2vw, 2.5rem); }
.work-page__filter {
  font-size: 14px; font-weight: 500; color: var(--text-secondary); cursor: pointer;
  transition: color .2s var(--ease-wave);
}
.work-page__filter:hover { color: var(--text-primary); }
.work-page__filter.is-active { color: var(--accent-primary); }
```

Immediately after it, add:

```css
.work-page__filter-block { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
.work-page__mode-toggle { display: flex; gap: 1.25rem; }
.work-page__mode-tab {
  font-size: 13px; font-weight: 700; color: var(--text-tertiary); cursor: pointer;
  padding-bottom: 3px; border-bottom: 2px solid transparent;
  transition: color .2s var(--ease-wave), border-color .2s var(--ease-wave);
}
.work-page__mode-tab:hover { color: var(--text-primary); }
.work-page__mode-tab.is-active { color: var(--text-primary); border-bottom-color: var(--accent-primary); }
```

Do not modify the existing `.work-page__head` rule (`display: flex; align-items: baseline; justify-content: space-between; gap: clamp(1.5rem, 3vw, 4rem); flex-wrap: wrap;`) yet — verify visually in Step 4 first, since `.work-page__filter-block` is now two lines tall (toggle + pills) instead of one.

- [ ] **Step 3: Verify TypeScript and lint are clean**

Run:
```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && npx tsc -b && npm run lint
```
Expected: both clean, no errors.

- [ ] **Step 4: Verify the full feature live in the browser**

Reload the page and run this via `mcp__Claude_Browser__javascript_tool` (assumes the dev server from Task 1 Step 5 is still running — if not, `preview_start`/`navigate` to `http://localhost:5173/work` first):

```js
(function() {
  const results = {};

  // 1. Default state: Category tab active, all 10 projects visible.
  const catTab = document.querySelector('.work-page__mode-tab');
  results.defaultTabIsCategory = catTab.textContent === 'Category' && catTab.classList.contains('is-active');
  results.defaultCardCount = document.querySelectorAll('.work-grid .pw-card').length;

  // 2. Switch to Client tab: pill row should now show client names, not category tags.
  const clientTab = Array.from(document.querySelectorAll('.work-page__mode-tab')).find(t => t.textContent === 'Client');
  clientTab.click();
  const clientPills = Array.from(document.querySelectorAll('.work-page__filters .work-page__filter')).map(b => b.textContent);
  results.clientPillsShown = clientPills;

  // 3. Select a client: grid should narrow to exactly that client's project(s).
  const northwindPill = Array.from(document.querySelectorAll('.work-page__filters .work-page__filter')).find(b => b.textContent === 'Northwind Energy');
  northwindPill.click();
  results.afterSelectClientCount = document.querySelectorAll('.work-grid .pw-card').length;
  results.afterSelectClientTitle = document.querySelector('.work-grid .pw-card__title')?.textContent;
  results.pillIsActive = northwindPill.classList.contains('is-active');

  // 4. Click the same client again: should clear back to showing everything.
  northwindPill.click();
  results.afterDeselectCount = document.querySelectorAll('.work-grid .pw-card').length;

  // 5. Select a client, then switch back to Category: category pills (not
  //    client pills) should show again, with no category active (since none
  //    was ever picked in this sequence).
  northwindPill.click();
  const categoryTabAgain = Array.from(document.querySelectorAll('.work-page__mode-tab')).find(t => t.textContent === 'Category');
  categoryTabAgain.click();
  const pillsAfterSwitchBack = Array.from(document.querySelectorAll('.work-page__filters .work-page__filter')).map(b => b.textContent);
  results.pillsAfterSwitchBack = pillsAfterSwitchBack;
  results.countAfterSwitchBack = document.querySelectorAll('.work-grid .pw-card').length;

  return JSON.stringify(results, null, 2);
})();
```

Expected values:
- `defaultTabIsCategory: true`
- `defaultCardCount: 10` (or whatever `PROJECTS.length` currently is — cross-check `src/data/work.ts` if it's changed since this plan was written)
- `clientPillsShown`: an array of 10 client names, alphabetically sorted (e.g. starts with `"Arclight Studios"`, not `"Northwind Energy"`)
- `afterSelectClientCount: 1`
- `afterSelectClientTitle: "Northwind"`
- `pillIsActive: true`
- `afterDeselectCount: 10`
- `pillsAfterSwitchBack`: the 8 category tag names (`Web`, `Brand`, `Motion`, `Dev`, `CMS`, `UX`, `Packaging`, `Design System`), **not** client names — proves switching tabs correctly swaps which pill row renders
- `countAfterSwitchBack: 10` (no category was ever selected in this sequence, so the grid is unfiltered)

If `defaultCardCount` or `afterDeselectCount` don't match `PROJECTS.length`, or `afterSelectClientCount` isn't exactly `1`, stop and re-check Task 1's `visibleProjects` branch before touching markup further — the logic, not the markup, is the likely cause.

- [ ] **Step 5: Take a screenshot and visually confirm the toggle/pill layout**

```
mcp__Claude_Browser__computer { "action": "screenshot" }
```

Confirm: the "Category"/"Client" tab pair sits above the filter pills, both right-aligned under "All projects.", and the active tab shows an orange underline (per `.work-page__mode-tab.is-active`'s `border-bottom-color: var(--accent-primary)`). If the filter block looks vertically misaligned against the "All projects." title (a plausible side-effect of `.work-page__head`'s existing `align-items: baseline` now measuring against a two-line-tall flex item instead of one line), change `align-items: baseline` to `align-items: flex-end` in the `.work-page__head` rule in `src/index.css` and re-screenshot to confirm it looks right. Only make this change if the live screenshot actually looks misaligned — don't change it preemptively.

- [ ] **Step 6: Check mobile layout**

```
mcp__Claude_Browser__resize_window { "preset": "mobile" }
```
```
mcp__Claude_Browser__navigate { "url": "http://localhost:5173/work" }
```
```
mcp__Claude_Browser__computer { "action": "screenshot" }
```

Confirm the mode toggle and filter pills wrap sensibly below "All projects." at 375px width (per the spec, no new mobile-specific CSS is expected to be needed — `.work-page__head`'s and `.work-page__filters`' existing `flex-wrap: wrap` should already handle it). If it looks broken, add a mobile-only override in `src/index.css` under a `@media (max-width: 767px)` block scoped to `.work-page__filter-block`/`.work-page__mode-toggle` — but only if the screenshot shows an actual problem, not preemptively. Resize back afterward:

```
mcp__Claude_Browser__resize_window { "preset": "desktop" }
```

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/ups tl/02 pixelwave/00_pixel/000_sito" && git add src/pages/WorkPage.tsx src/index.css && git commit -m "$(cat <<'EOF'
Add Category/Client mode toggle to the work page filter row

Client tab shows a single-select pill row (client names, sourced
from Project.client) instead of the multi-select category tags —
picking a client narrows the grid to just their work; picking the
active one again clears it. Each mode keeps its own selection when
you switch tabs, only the active mode drives the grid.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Mode toggle (Category/Client tabs, Category default) → Task 2, Step 1.
- Category multi-select unchanged → Task 1, Step 3 (`toggleTag`/category branch untouched in behavior) + Task 1, Step 5 regression check.
- Client single-select, click-active-to-clear → Task 1, Step 3 (`selectClient`) + Task 2, Step 4 assertions 3–4.
- Selections preserved independently across tab switches → Task 1, Step 3 (three separate state vars, no reset on `setMode`) + Task 2, Step 4 assertion 5.
- Empty-state (no selection shows everything) → Task 1, Step 3 (`visibleProjects` early-returns `PROJECTS`) + Task 2, Step 4 assertions 1 and 4.
- `FILTER_CLIENTS` derivation, sorted alphabetically → Task 1, Step 2.
- Markup reusing `.work-page__filter`/`.work-page__filters` unchanged, new `.work-page__filter-block`/`.work-page__mode-toggle`/`.work-page__mode-tab` → Task 2, Steps 1–2.
- Mobile: no preemptive new rules, verify-then-fix-only-if-broken → Task 2, Step 6.
- Out of scope (no combined filtering, no data model changes, no dropdown/search) — nothing in this plan does any of those; confirmed by absence.

**Placeholder scan:** No TBD/TODO. Step 5 and Step 6 in Task 2 contain conditional follow-up actions ("only if the screenshot shows X"), not vague placeholders — both give the exact CSS change to make if needed, matching the spec's own "exact spacing numbers get tuned against the live browser preview" instruction.

**Type consistency:** `mode: "category" | "client"` used identically in Task 1 (state declaration) and Task 2 (JSX comparisons `mode === "category"`). `activeClient: string | null` and `selectClient(client: string): void` match between Task 1's definition and Task 2's usage (`onClick={() => selectClient(client)}`, `activeClient === client`). `FILTER_CLIENTS: string[]` from Task 1 is mapped identically to how `FILTER_TAGS` is already mapped in the pre-existing category JSX. No signature drift found.
