# Site-wide dot-grid background — design

## Context

`CursorGlow` (`src/components/motion/CursorGlow.tsx`) currently exists only on the Contact page: a canvas drawing a faint grid of dots that brighten in the site's orange accent color near the cursor, respecting `prefers-reduced-motion`. Separately, three hero-style sections (`Hero.tsx` on the homepage, `WorkPage.tsx`'s `.work-hero`) use `PixelTrail` (`src/components/ui/pixel-trail.tsx`) — a different, discrete hover-trail effect (individual cells light up and fade as the cursor passes over them). This extends `CursorGlow` site-wide as the one shared ambient background, and removes `PixelTrail` from those two hero sections (its third usage, the Menu button's hover-glow in `Header.tsx`, is unrelated and stays exactly as-is).

## Component API changes

`CursorGlow` gains two props, both optional with defaults matching its current (Contact-page) behavior exactly:

```ts
interface CursorGlowProps {
  className?: string
  variant?: "dark" | "light"  // default "dark"
  glow?: boolean               // default true
}
```

- `variant` controls only the *baseline* (non-brightened) dot color: `"dark"` keeps today's faint white (`rgba(255,255,255,0.06)`), `"light"` swaps it for a faint black/dark tint of equivalent visual weight, for use on light-background sections. The cursor-brightened dots stay the same brand orange in both variants — only the resting color changes.
- `glow` toggles whether the component tracks the cursor at all. When `false`, it skips attaching any `mousemove`/`mouseleave`/`resize`-driven redraw loop tied to cursor position — it draws the static baseline grid once, and redraws only on `resize`. This is cheaper than even the current reduced-motion path (no `requestAnimationFrame` loop of any kind, since nothing ever changes frame-to-frame). When `true`, behavior is identical to what Contact has today, `prefers-reduced-motion` handling included.

## Site-wide placement

One `CursorGlow` instance per section (not one per page) — each section wraps it in its own `position: relative` container (most already are) with the canvas `position: absolute; inset: 0`, matching Contact's existing pattern exactly. This avoids needing any scroll-position theme detection: each section already knows its own theme and hero-status statically.

| Page | Section | `variant` | `glow` |
|---|---|---|---|
| Home | `Hero.tsx` | `light` | `true` (replaces `PixelTrail`) |
| Home | `WorkReel.tsx` | — | skipped — already has its own full-bleed pinned video/gallery content; a dot grid would be invisible under it |
| Home | `TickerStrip.tsx` | `dark` | `false` |
| Home | `Services.tsx` | `dark` | `false` |
| Home | `Footer.tsx` | `light` | `false` |
| Work | `WorkPage.tsx`'s `.work-hero` | `light` | `true` (replaces `PixelTrail`) |
| Work | card grid + `Footer.tsx` | `light` | `false` |
| Project | `ProjectPage.tsx` title/opening area | `dark` | `true` |
| Project | pinned video section | — | skipped — already has its own video content |
| Project | gallery + remainder | `dark` | `false` |
| Studio | `StudioIntro.tsx` | `dark` | `true` |
| Studio | `StudioTeam.tsx`, `StudioFloorPlan.tsx` | `dark` | `false` |
| Contact | whole page | `dark` | `true` (unchanged — already shipped; no separate smaller hero region on this page, so the glow legitimately covers everything, same as today) |

## Removing PixelTrail from the heroes

`Hero.tsx` and `WorkPage.tsx` each currently render:

```tsx
<PixelTrail pixelSize={...} fadeDuration={...} className="z-0" pixelClassName="hero__trail-pixel" />
```

Both are replaced in-place with:

```tsx
<CursorGlow variant="light" glow className="..." />
```

`Header.tsx`'s own `PixelTrail` usage (the Menu button's hover-glow, `.nav__menu-btn-grid`/`.nav__menu-btn-pixel`) is untouched — `pixel-trail.tsx` stays in the codebase since Header still depends on it. Only the two hero call-sites and their now-dead `.hero__trail-pixel` CSS rule are removed.

## Accessibility

`glow={false}` instances need no reduced-motion handling — they're static by construction. `glow={true}` instances are unchanged from today. Every instance stays `aria-hidden="true"` with `pointer-events: none` on its wrapper, so nothing here ever intercepts clicks or gets announced to screen readers.

## Out of scope

- `Header.tsx`'s Menu button pixel-glow effect (built and verified earlier this session) — unrelated, not touched.
- Any change to Contact page's existing full-page glow behavior — confirmed to stay as-is.
- Scroll-position-based theme detection for a single page-spanning canvas — rejected in favor of one instance per section.

## Files touched

- `src/components/motion/CursorGlow.tsx` — add `variant`/`glow` props; branch the effect to skip cursor tracking entirely when `glow={false}`; parameterize the baseline dot color by `variant`.
- `src/components/sections/Hero.tsx` — replace `PixelTrail` with `CursorGlow variant="light" glow`.
- `src/pages/WorkPage.tsx` — replace `PixelTrail` with `CursorGlow variant="light" glow`.
- `src/components/sections/TickerStrip.tsx`, `src/components/sections/Services.tsx`, `src/components/sections/Footer.tsx` — add a `dark`/`light` non-glow `CursorGlow` background layer respectively.
- `src/pages/ProjectPage.tsx` — add a `dark` `glow` instance on the title/opening area, `dark` non-glow on the gallery/remainder (skipping the pinned video section).
- `src/components/sections/StudioIntro.tsx` — add a `dark` `glow` instance.
- `src/components/sections/StudioTeam.tsx`, `src/components/sections/StudioFloorPlan.tsx` — add `dark` non-glow instances.
- `src/index.css` — remove the now-dead `.hero__trail-pixel` rule (confirm no other reference first); add any new small wrapper-positioning rules needed per section (most sections are already `position: relative`, matching Contact's existing `.contact-page__glow` pattern).
