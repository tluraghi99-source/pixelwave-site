# Work page client filter — design spec

**Date:** 2026-08-11
**Status:** Approved, pending implementation

## Summary

Add a second filter dimension to `/work` — filtering by client, alongside
the existing category (tag) filter — as a mode switch, not a combinable
facet. A "Category / Client" tab pair sits above the filter pill row;
switching tabs swaps which pill row is shown and which dimension is
currently driving the grid. Designed for a future roster of repeat
clients, even though today's placeholder data (`src/data/work.ts`) has
exactly one project per client.

## Interaction model

- **Mode toggle**: two tabs, "Category" and "Client". Only one is active
  at a time; only the active mode's selection affects the visible grid.
  Default mode on page load: **Category** (matches current behavior
  exactly when nobody has touched the new tab).
- **Category pills**: unchanged from today — multi-select, OR-matched
  against `Project.tags`.
- **Client pills**: **single-select**. Clicking a client shows only that
  client's project(s); clicking the already-active client deselects it
  (back to showing everything). No multi-client selection — "show me
  X's work" is a lookup, not a facet you stack with other clients.
- **Switching tabs preserves each dimension's own selection.** Flipping
  from Category to Client and back doesn't clear whatever categories
  were checked — only the *active* mode's selection is applied to the
  grid at any moment. (e.g., picking "Web", switching to Client and
  picking "Northwind Energy", then switching back to Category shows
  "Web" still checked and back in effect.)
- With no selection in the active mode (fresh load, or a client
  deselected back to none), the grid shows everything — same empty-state
  behavior the category filter already has.

## Data

No changes to `src/data/work.ts` — `Project.client: string` already
exists and is exactly what this needs.

In `src/pages/WorkPage.tsx`, alongside the existing `FILTER_TAGS`:

```ts
const FILTER_CLIENTS = Array.from(new Set(PROJECTS.map((p) => p.client))).sort()
```

Sorted alphabetically (unlike `FILTER_TAGS`, which keeps insertion
order) — categories are a small, deliberately curated set where order
doesn't matter much; clients are the dimension expected to grow, so
alphabetical keeps a long list scannable.

## State

Replaces the single `activeTags` state with three pieces of state:

```ts
const [mode, setMode] = useState<"category" | "client">("category")
const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
const [activeClient, setActiveClient] = useState<string | null>(null)
```

`toggleTag` stays as it is today. New `selectClient`:

```ts
function selectClient(client: string) {
  setActiveClient((prev) => (prev === client ? null : client))
}
```

`visibleProjects` branches on `mode`:

```ts
const visibleProjects = useMemo(() => {
  if (mode === "category") {
    if (activeTags.size === 0) return PROJECTS
    return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
  }
  if (!activeClient) return PROJECTS
  return PROJECTS.filter((p) => p.client === activeClient)
}, [mode, activeTags, activeClient])
```

## Markup

`.work-page__head` currently lays out the "All projects." title on the
left and the filter row on the right (`justify-content: space-between`).
The filter row grows a mode toggle above the pills, both right-aligned
under the title:

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

Both pill rows reuse the existing `.work-page__filter` / `.work-page__filters`
classes unchanged — same visual language as today's category row (this
was the explicit outcome of the visual comparison: plain pills, not a
dropdown or search input). Real `<button>` elements with `role="tab"` /
`aria-selected` for the toggle (not bare `<span>`s, unlike the
throwaway HTML mockup used to compare options) so it's keyboard- and
screen-reader-accessible like the rest of the page's controls.

## Styling

New rules in `src/index.css`, next to the existing `.work-page__*` rules:

- `.work-page__filter-block`: `display: flex; flex-direction: column;
  align-items: flex-end; gap: 0.6rem;` — stacks the toggle above the
  pill row, right-aligned to match today's filter row position.
- `.work-page__mode-toggle`: `display: flex; gap: 1.25rem;`
- `.work-page__mode-tab`: small bold label (~13px, `font-weight: 700`),
  muted (`color: var(--text-tertiary)` or similar existing muted token)
  by default, `border-bottom: 2px solid transparent`, `.is-active` sets
  `color: var(--text-primary)` and `border-bottom-color:
  var(--accent-primary)` (the orange) — mirrors the underline-tab
  language, not the pill language, so the toggle reads as a distinct
  control from the filter pills beneath it.
- `.work-page__filters` and `.work-page__filter` stay exactly as they
  are — no changes needed, both pill rows already use them as-is.

Exact spacing numbers get tuned against the live browser preview during
implementation, same as every other section in this codebase.

## Mobile

No new mobile-specific rules planned — `.work-page__head`'s existing
`flex-wrap: wrap` already lets the filter block drop below the title on
narrow viewports, and `.work-page__filters`' existing `flex-wrap: wrap`
already handles a pill row that's wider than the viewport. The mode
toggle sits above the pills in normal block flow either way. Verify this
holds during implementation; add mobile-only overrides only if the live
preview shows a real problem, not preemptively.

## Out of scope

- Combining category and client filters (e.g. "Web work for Northwind
  Energy") — explicitly rejected in favor of a mode switch, see
  Interaction model above.
- Any change to `data/work.ts`'s placeholder roster — this ships against
  today's 10 fictional projects/clients exactly as they exist.
- Dropdown or search-input treatment for the client list — compared
  against the plain pill-row approach during design and rejected in
  favor of matching the existing category filter's visual language.
