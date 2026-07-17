# Services Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scroll-pinned Services section with a plain in-flow accordion — rows expand on hover (desktop) / tap (touch), one open at a time, revealing a description, tag columns, and a placeholder image.

**Architecture:** `src/data/services.ts` gains per-service `desc`/`tagCols` copy (Task 1, additive — nothing consumes it yet, so the current site is unaffected). Task 2 rewrites `src/components/sections/Services.tsx` into a single component (no more `ServicesPinned`/`ServicesAmbient` split), replaces the scroll-pin CSS in `src/index.css` with new accordion CSS, and removes the now-dead `tags` field from `services.ts`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Framer Motion (only for the existing `Reveal`/`RevealGroup`/`RevealItem` viewport-entrance components — the accordion's own expand/collapse and hover states are plain CSS, no Framer Motion).

## Global Constraints

- Design authority: `docs/superpowers/specs/2026-07-17-services-accordion-design.md` — read it if anything here is ambiguous.
- No test framework exists in this project (no vitest/jest/playwright in `package.json`). Verification is `npx tsc -b --noEmit` (must be clean) plus manual browser observation — do not invent test files.
- Dev server: `npm run dev` (Vite, default port 5173). The Services section lives on the homepage (`/`) — scroll to `#services` or click the "Services" nav-panel link to reach it.
- Follow existing code style: no comments explaining *what* code does, only *why* when non-obvious (see existing files for the house style).
- Reuse `src/components/pw/Tag.tsx` (`<Tag variant="cyan">`) for tag pills — do not build a new tag component.
- Reuse `src/components/motion/Reveal.tsx`'s `Reveal`/`RevealGroup`/`RevealItem` for the section's viewport-entrance fade — do not build new scroll-trigger logic.
- Do not modify `Reveal.tsx`, `Tag.tsx`, `SectionLabel.tsx`, or any other section (`WorkReel`, `Studio`, `TickerStrip`, `Footer`) — this plan touches exactly three files: `src/data/services.ts`, `src/components/sections/Services.tsx`, `src/index.css`.
- `prefers-reduced-motion` is already handled globally (`index.css`, `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; } }`) — every plain-CSS `transition` this plan adds is automatically covered by that existing rule. No extra reduced-motion handling is needed in either task.

---

### Task 1: Add `desc`/`tagCols` copy to `services.ts`

**Files:**
- Modify: `src/data/services.ts`

**Interfaces:**
- Consumes: nothing (self-contained data file).
- Produces: each entry in `SERVICES` gains `desc: string` and `tagCols: string[][]` (2 columns of 2 tags each), alongside the existing `num`/`name`/`tags` fields (the old `tags` field is deliberately **kept** in this task — it's still consumed by the current, unmodified `Services.tsx`. Task 2 removes it once nothing reads it anymore). Task 2's `Services.tsx` will read `service.desc` and `service.tagCols`.

- [ ] **Step 1: Replace the file with the copy below**

```ts
export const SERVICES = [
  {
    num: "01",
    name: "Web Design",
    tags: ["UX/UI", "Design Systems"],
    desc: "Interfaces that feel considered from the first click — structure, motion, and detail working together instead of fighting each other.",
    tagCols: [
      ["UX/UI", "Design Systems"],
      ["Prototyping", "Accessibility"],
    ],
  },
  {
    num: "02",
    name: "Brand Identity",
    tags: ["Logo", "Guidelines"],
    desc: "A visual language built to hold up across every surface it touches, from a business card to a billboard.",
    tagCols: [
      ["Logo", "Guidelines"],
      ["Naming", "Art Direction"],
    ],
  },
  {
    num: "03",
    name: "Motion",
    tags: ["Interaction", "Video"],
    desc: "Interaction and animation that explain themselves — every transition earns its place, nothing moves just to move.",
    tagCols: [
      ["Interaction", "Video"],
      ["Storyboarding", "3D"],
    ],
  },
  {
    num: "04",
    name: "Development",
    tags: ["Front-end", "Headless"],
    desc: "Fast, resilient front-ends built directly from the design system — no gap between what's designed and what ships.",
    tagCols: [
      ["Front-end", "Headless"],
      ["Performance", "CMS"],
    ],
  },
  {
    num: "05",
    name: "Photo",
    tags: ["Editorial", "Retouching"],
    desc: "Editorial and product photography shot to match the brand's own tone, not bolted on after the fact.",
    tagCols: [
      ["Editorial", "Retouching"],
      ["Product", "Art Direction"],
    ],
  },
  {
    num: "06",
    name: "Video & Editing",
    tags: ["Production", "Color Grade"],
    desc: "From concept to final grade — short-form, brand film, and everything a launch needs to move.",
    tagCols: [
      ["Production", "Color Grade"],
      ["Editing", "Sound Design"],
    ],
  },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no output (clean). The existing `Services.tsx` only reads `s.num`, `s.name`, `s.tags` — all three still exist, so nothing breaks.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open the printed localhost URL, scroll to the Services section (or click "Services" in the nav menu).
Expected: visually identical to before this task — still the old scroll-pinned reveal with 6 rows of name/number/tags. `desc`/`tagCols` exist in the data but nothing reads them yet.

- [ ] **Step 4: Commit**

```bash
git add src/data/services.ts
git commit -m "Add per-service description and tag-column copy to services.ts"
```

---

### Task 2: Rewrite Services.tsx as an in-flow accordion, replace the scroll-pin CSS

**Files:**
- Modify: `src/components/sections/Services.tsx` (full rewrite)
- Modify: `src/data/services.ts` (remove the now-unused `tags` field)
- Modify: `src/index.css` (remove lines 723–757 — the `.svc-pin`/`.svc__*` scroll-pin rules — replace with new `.svc-row*` accordion rules)

**Interfaces:**
- Consumes: `SERVICES` from `src/data/services.ts` (`{ num: string; name: string; desc: string; tagCols: string[][] }[]`), `Tag` from `@/components/pw/Tag` (`<Tag variant="cyan">{children}</Tag>`), `SectionLabel` from `@/components/pw/SectionLabel` (`<SectionLabel number="03">Services</SectionLabel>`), `Reveal`/`RevealGroup`/`RevealItem` from `@/components/motion/Reveal`.
- Produces: `export function Services()` — same export name and no-props signature as before, so `HomePage.tsx`'s `<Services />` usage is unchanged.

- [ ] **Step 1: Remove the `tags` field from `services.ts`**

Replace the file with:

```ts
export const SERVICES = [
  {
    num: "01",
    name: "Web Design",
    desc: "Interfaces that feel considered from the first click — structure, motion, and detail working together instead of fighting each other.",
    tagCols: [
      ["UX/UI", "Design Systems"],
      ["Prototyping", "Accessibility"],
    ],
  },
  {
    num: "02",
    name: "Brand Identity",
    desc: "A visual language built to hold up across every surface it touches, from a business card to a billboard.",
    tagCols: [
      ["Logo", "Guidelines"],
      ["Naming", "Art Direction"],
    ],
  },
  {
    num: "03",
    name: "Motion",
    desc: "Interaction and animation that explain themselves — every transition earns its place, nothing moves just to move.",
    tagCols: [
      ["Interaction", "Video"],
      ["Storyboarding", "3D"],
    ],
  },
  {
    num: "04",
    name: "Development",
    desc: "Fast, resilient front-ends built directly from the design system — no gap between what's designed and what ships.",
    tagCols: [
      ["Front-end", "Headless"],
      ["Performance", "CMS"],
    ],
  },
  {
    num: "05",
    name: "Photo",
    desc: "Editorial and product photography shot to match the brand's own tone, not bolted on after the fact.",
    tagCols: [
      ["Editorial", "Retouching"],
      ["Product", "Art Direction"],
    ],
  },
  {
    num: "06",
    name: "Video & Editing",
    desc: "From concept to final grade — short-form, brand film, and everything a launch needs to move.",
    tagCols: [
      ["Production", "Color Grade"],
      ["Editing", "Sound Design"],
    ],
  },
]
```

- [ ] **Step 2: Rewrite `Services.tsx`**

Replace the entire file with:

```tsx
import { useState } from "react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { SERVICES } from "@/data/services"

// Temporary stand-in photography (Lorem Picsum) until real service imagery is
// ready — same posture as Work.tsx's GALLERY_ITEMS.
const SERVICES_WITH_IMAGES = SERVICES.map((s) => ({
  ...s,
  image: `https://picsum.photos/seed/pixellwave-svc-${s.num}/800/600?grayscale`,
}))

function isHoverCapable() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
}

function ServiceRow({
  service,
  isOpen,
  onMouseEnter,
  onClick,
}: {
  service: (typeof SERVICES_WITH_IMAGES)[number]
  isOpen: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`svc-row${isOpen ? " svc-row--open" : ""}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div className="svc-row__head">
        <span className="svc-row__num">{service.num}</span>
        <span className="svc-row__name">{service.name}</span>
        <span className="svc-row__plus" aria-hidden="true" />
      </div>
      <div className="svc-row__body">
        <div className="svc-row__body-inner">
          <div className="svc-row__content">
            <div>
              <p className="svc-row__desc">{service.desc}</p>
              <div className="svc-row__tags">
                {service.tagCols.map((col, colI) => (
                  <div className="svc-row__tag-col" key={colI}>
                    {col.map((t, tagI) => (
                      <Tag
                        key={t}
                        variant="cyan"
                        style={{ transitionDelay: `${0.1 + (colI * col.length + tagI) * 0.05}s` }}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="svc-row__image">
              <img src={service.image} alt={service.name} loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Services() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="03">Services</SectionLabel>
        </Reveal>
        <div
          className="svc-list mt-12"
          onMouseLeave={() => {
            if (isHoverCapable()) setOpenIdx(null)
          }}
        >
          <RevealGroup stagger={0.1}>
            {SERVICES_WITH_IMAGES.map((s, i) => (
              <RevealItem key={s.num}>
                <ServiceRow
                  service={s}
                  isOpen={openIdx === i}
                  onMouseEnter={() => {
                    if (isHoverCapable()) setOpenIdx(i)
                  }}
                  onClick={() => {
                    if (!isHoverCapable()) setOpenIdx((prev) => (prev === i ? null : i))
                  }}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 4: Replace the scroll-pin CSS in `index.css`**

Find this block (currently lines 723–757 — search for the comment `/* Desktop Services — pinned, like .reel`):

```css
/* Desktop Services — pinned, like .reel: scroll scrubs each row's reveal in
   sequence before the section releases (WorkReel.tsx follows the same shape). */
.svc-pin { position: relative; }
/* Flex items shrink-to-fit their content by default in the main axis — without
   this, .wrap (a normal block everywhere else on the site) stops spanning the
   full page width the moment it becomes a flex child here. */
.svc-pin__inner {
  position: sticky; top: 0; height: 100svh; overflow: hidden;
  display: flex; align-items: center;
  padding-block: clamp(2.5rem, 5vw, 5rem);
}
.svc-pin__inner > .wrap { width: 100%; }

.svc { border-top: 1px solid var(--border-subtle); }
.svc__row {
  position: relative; overflow: hidden;
  padding: 1.1rem 0; border-bottom: 1px solid var(--border-subtle);
  transition: padding-left .3s var(--ease-wave);
  cursor: pointer;
}
.svc__row:hover { padding-left: 1.25rem; }
.svc__swatch {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(100deg, var(--pw-orange), var(--pw-cyan));
  transform: scaleX(0); transform-origin: left;
  transition: transform var(--dur-slow) var(--ease-wave);
}
.svc__row:hover .svc__swatch { transform: scaleX(1); }
.svc__top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: baseline; }
.svc__name { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.75rem, 2vw, 3.5rem); letter-spacing: -0.02em; transition: color var(--dur-base) var(--ease-wave); }
.svc__row:hover .svc__name { color: var(--pw-black); }
.svc__num { font-family: var(--font-mono-accent); font-size: 0.72rem; letter-spacing: 0.08em; color: var(--pw-orange); transition: color var(--dur-base) var(--ease-wave); }
.svc__row:hover .svc__num { color: var(--pw-black); }
.svc__tags { position: relative; z-index: 1; display: flex; gap: 1rem; flex-wrap: wrap; margin-top: .6rem; }
.svc__row:hover .svc__tags .pw-tag { color: var(--pw-black); border-color: var(--pw-black); }
```

Replace it with:

```css
/* Services accordion — plain in-flow list, no scroll-pin. Rows expand on
   hover (desktop) or tap (touch), one open at a time (Services.tsx owns the
   open/close state; this is purely the `.svc-row--open` visual state). */
.svc-list { border-top: 1px solid var(--border-subtle); }

.svc-row {
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.svc-row__head {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 1.25rem 0;
}
/* Number and name are one visual unit — same size/weight/color, not a small
   muted index next to a big name. */
.svc-row__num,
.svc-row__name {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: clamp(3rem, 6.5vw, 6.25rem);
  transition: color var(--dur-slow) var(--ease-wave), transform var(--dur-slow) var(--ease-wave);
}
.svc-row__num { flex-shrink: 0; }
.svc-row__name { flex: 1; }
.svc-row--open .svc-row__num,
.svc-row--open .svc-row__name { color: var(--pw-orange); transform: translateX(10px); }

.svc-row__plus {
  width: 28px; height: 28px;
  flex-shrink: 0;
  align-self: center;
  position: relative;
  transition: transform var(--dur-slow) var(--ease-wave);
}
.svc-row--open .svc-row__plus { transform: rotate(135deg); }
.svc-row__plus::before,
.svc-row__plus::after {
  content: "";
  position: absolute;
  background: var(--pw-orange);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
.svc-row__plus::before { width: 16px; height: 2px; }
.svc-row__plus::after { width: 2px; height: 16px; }

/* grid-template-rows 0fr -> 1fr trick: animates height without measuring it. */
.svc-row__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s var(--ease-wave);
}
.svc-row--open .svc-row__body { grid-template-rows: 1fr; }
.svc-row__body-inner { overflow: hidden; }

.svc-row__content {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 2.5rem;
  padding: 0 0 2.5rem 4rem;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.35s ease 0.05s, transform 0.35s ease 0.05s;
}
.svc-row--open .svc-row__content { opacity: 1; transform: translateY(0); }

.svc-row__desc {
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 44ch;
  margin: 0 0 1.5rem;
}
.svc-row__tags { display: flex; gap: 2.5rem; }
.svc-row__tag-col { display: flex; flex-direction: column; gap: 0.6rem; }
/* Scoped to this component's own tag pills only — must not affect .pw-tag
   anywhere else on the site. */
.svc-row__tags .pw-tag {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.svc-row--open .svc-row__tags .pw-tag { opacity: 1; transform: translateY(0); }

.svc-row__image {
  border-radius: 4px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--pw-neutral-10);
  width: 280px;
}
.svc-row__image img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: grayscale(1);
  display: block;
  transform: scale(1.12);
  transition: transform 0.6s var(--ease-wave);
}
.svc-row--open .svc-row__image img { transform: scale(1); }

@media (max-width: 860px) {
  .svc-row__content { grid-template-columns: 1fr; padding-left: 0; }
  .svc-row__image { width: 100%; max-width: 280px; }
}
```

- [ ] **Step 5: Typecheck again**

Run: `npx tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Manual verification in the browser**

Run: `npm run dev`, open the printed localhost URL.

1. Scroll to `#services`. Expected: the section opens straight from the "03 — Services" label into the row list (no "What we make." heading — that copy was already removed in an earlier commit). No page-lock/scroll-pin — the section scrolls past normally.
2. Expected: rows span the full page width (same left/right margin as the header/footer), not a narrower centered column.
3. Hover row "01 Web Design" (desktop pointer). Expected: the row expands — number and name turn orange and shift right slightly, the `+` rotates into an `×`, and a description + two tag columns + a 280px grayscale image fade/rise in, with the tag pills appearing one after another (not all at once) and the image visibly settling from a slight zoom into place.
4. Move the pointer to a different row (e.g. "03 Motion") without leaving the list. Expected: row 01 closes and row 03 opens — only one row open at a time.
5. Move the pointer off the whole row list (e.g. up to the section label). Expected: whichever row was open closes.
6. In the browser devtools (or via `resize_window`/device emulation), simulate a touch/coarse pointer and confirm tapping a row's header toggles it open, and tapping the same row again closes it (hover-driven open/close should not interfere on a touch-emulated device).

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/Services.tsx src/data/services.ts src/index.css
git commit -m "Replace Services' scroll-pin with a plain hover/tap accordion"
```
