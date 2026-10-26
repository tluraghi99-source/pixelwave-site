let cached: boolean | undefined

/** Whether this browser can create a WebGL context (the two circular
 *  carousels need one). Missing on some old browsers, locked-down work
 *  machines, and anywhere the GPU is blacklisted or disabled. Checked once
 *  and remembered: asking creates a throwaway canvas. */
export function hasWebGL(): boolean {
  if (cached !== undefined) return cached
  try {
    const canvas = document.createElement("canvas")
    cached = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    cached = false
  }
  return cached
}
