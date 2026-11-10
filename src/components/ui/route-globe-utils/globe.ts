import { LAND_MASK_BASE64, LAND_MASK_HEIGHT, LAND_MASK_WIDTH } from "./land-mask"

export type Vec3 = [number, number, number]

const RAD = Math.PI / 180

/** A point on the unit sphere from longitude / latitude in degrees. The
 *  viewer looks down -z, so z > 0 is the side facing the viewer. */
export function toVec(lon: number, lat: number): Vec3 {
  const phi = lat * RAD
  const lam = lon * RAD
  return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)]
}

/** Turns the globe so longitude `yaw` (radians) faces the viewer, then tips
 *  it by `tilt` so the north pole leans toward the viewer. */
export function rotate(v: Vec3, yaw: number, tilt: number): Vec3 {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const x1 = v[0] * cy - v[2] * sy
  const z1 = v[0] * sy + v[2] * cy
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  return [x1, v[1] * ct - z1 * st, v[1] * st + z1 * ct]
}

/** The point a fraction `t` of the way along the great circle from a to b. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return a
  const s = Math.sin(omega)
  const ka = Math.sin((1 - t) * omega) / s
  const kb = Math.sin(t * omega) / s
  return [ka * a[0] + kb * b[0], ka * a[1] + kb * b[1], ka * a[2] + kb * b[2]]
}

let mask: Uint8Array | null = null
function isLand(lonDeg: number, latDeg: number): boolean {
  if (!mask) {
    const bin = atob(LAND_MASK_BASE64)
    mask = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) mask[i] = bin.charCodeAt(i)
  }
  const col = Math.min(LAND_MASK_WIDTH - 1, Math.max(0, Math.floor(((lonDeg + 180) / 360) * LAND_MASK_WIDTH)))
  const row = Math.min(LAND_MASK_HEIGHT - 1, Math.max(0, Math.floor(((90 - latDeg) / 180) * LAND_MASK_HEIGHT)))
  const idx = row * LAND_MASK_WIDTH + col
  return (mask[idx >> 3] & (0x80 >> (idx & 7))) !== 0
}

const dotCache = new Map<number, Float32Array>()

/** About `count` evenly spread points over the sphere (a Fibonacci spiral),
 *  keeping only those that fall on land. Flat [x, y, z, x, y, z, ...]. */
export function landDots(count: number): Float32Array {
  const cached = dotCache.get(count)
  if (cached) return cached
  const out: number[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const ring = Math.sqrt(1 - y * y)
    const phi = i * golden
    const x = Math.cos(phi) * ring
    const z = Math.sin(phi) * ring
    const lat = Math.asin(y) / RAD
    const lon = Math.atan2(x, z) / RAD
    if (isLand(lon, lat)) out.push(x, y, z)
  }
  const dots = new Float32Array(out)
  dotCache.set(count, dots)
  return dots
}

export type GlobeView = { cx: number; cy: number; r: number; yaw: number; tilt: number }

// Dots turned away from the viewer are not drawn; those near the edge are
// dimmer, so the sphere reads as round. Three brightness steps, one pass each.
const SHADES = [
  { max: 0.28, alpha: 0.28 },
  { max: 0.6, alpha: 0.6 },
  { max: 1.01, alpha: 1 },
]

/** Draws the soft glow behind the globe, a faint disc, and the land dots. */
export function drawGlobe(
  ctx: CanvasRenderingContext2D,
  dots: Float32Array,
  view: GlobeView,
  land: string,
  dotSize: number,
  glow: string,
  disc: string
) {
  const { cx, cy, r, yaw, tilt } = view
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.35)
  halo.addColorStop(0, glow)
  halo.addColorStop(1, "transparent")
  ctx.globalAlpha = 1
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  const cyaw = Math.cos(yaw)
  const syaw = Math.sin(yaw)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  const half = dotSize / 2
  ctx.fillStyle = land
  for (const shade of SHADES) {
    ctx.globalAlpha = shade.alpha
    const lower = shade === SHADES[0] ? 0 : SHADES[SHADES.indexOf(shade) - 1].max
    ctx.beginPath()
    for (let i = 0; i < dots.length; i += 3) {
      const x = dots[i]
      const y = dots[i + 1]
      const z = dots[i + 2]
      const z1 = x * syaw + z * cyaw
      const z2 = y * st + z1 * ct
      if (z2 <= lower || z2 > shade.max) continue
      const x1 = x * cyaw - z * syaw
      const y2 = y * ct - z1 * st
      ctx.rect(cx + x1 * r - half, cy - y2 * r - half, dotSize, dotSize)
    }
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
