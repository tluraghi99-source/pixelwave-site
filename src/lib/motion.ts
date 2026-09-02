/** Shared motion tokens — mirrors --ease-wave / --dur-* from the design system. */
export const EASE_WAVE = [0.22, 1, 0.36, 1] as const
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const

export const DUR_BASE = 0.25
export const DUR_SLOW = 0.45
export const DUR_REVEAL = 0.7

/** Scroll window (in multiples of viewport height, global scrollY) shared by
 *  three things at once: the hero mark's shrink-and-dock into the header
 *  logo's spot, the header logo's own fade-in, and the video's center-out
 *  iris reveal in WorkReel — all keyed off the exact same progress value so
 *  they move together frame by frame, not just "around the same time." Starts
 *  at the very first pixel of scroll (no static hold) so the reveal reads as
 *  part of the hero itself rather than something you have to scroll past a
 *  dead zone to reach; the video's iris is a fixed overlay during this whole
 *  window (see WorkReel.tsx), not tied to page scroll flow, so nothing visibly
 *  "arrives" from off-screen — only the logo and the iris transform in place. */
export const HERO_REVEAL_START = 0
export const HERO_REVEAL_END = 1.3
/** Within that shared window, the opacity crossfade (big mark → small header
 *  logo) happens only in this final fraction, after the shrink/move/iris
 *  have mostly settled — mirrors the old HERO_HANDOFF_START/HERO_DOCK_END
 *  ratio (0.75/0.85 ≈ 0.88). */
export const HERO_CROSSFADE_RATIO = 0.88
/** Gives the docked logo a stable moment before scroll-down auto-hide can kick in. */
export const HERO_NAV_HIDE_AFTER = 1.5

/** Loops v back into [min, max) — used to make a translated strip repeat seamlessly. */
export function wrap(min: number, max: number, v: number) {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}
