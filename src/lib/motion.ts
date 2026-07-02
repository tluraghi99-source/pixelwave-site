/** Shared motion tokens — mirrors --ease-wave / --dur-* from the design system. */
export const EASE_WAVE = [0.22, 1, 0.36, 1] as const
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const

export const DUR_BASE = 0.25
export const DUR_SLOW = 0.45
export const DUR_REVEAL = 0.7

/** Loops v back into [min, max) — used to make a translated strip repeat seamlessly. */
export function wrap(min: number, max: number, v: number) {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}
