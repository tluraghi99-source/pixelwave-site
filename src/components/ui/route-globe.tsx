import { useEffect, useRef, type CSSProperties } from "react"
import type { MotionValue } from "framer-motion"
import { drawGlobe, landDots, rotate, slerp, toVec, type Vec3 } from "./route-globe-utils/globe"

/**
 * Route Globe
 * A dotted globe with arcs from one hub. Each route lifts off the surface on a
 * great circle; a comet runs along it and the destination pulses when it lands.
 * Every destination carries its own label (a button: name, and the place under
 * it). Drag to spin; it turns slowly on its own when left alone, and holds
 * still while a label is under the pointer or has focus.
 */

export type Place = { id: string; name: string; lon: number; lat: number; note?: string }

export type GlobeTheme = {
  land: string
  arc: string
  glow: string
  /** The faint disc the globe sits on. */
  disc: string
  text: string
}

type Props = {
  hub: Place
  places: Place[]
  theme?: GlobeTheme
  motion?: "full" | "reduced"
  /** Called when a destination's label is clicked, with the box of its dot. */
  onSelect?: (place: Place, origin: DOMRect) => void
  /** 0 → 1: how far the globe has come up from its opening pose (huge, rising
   *  from below the bottom edge) to its resting one (centred, as tall as the
   *  box lets it be). Left out, it simply rests. Labels fade in near the end. */
  progress?: MotionValue<number>
  className?: string
  style?: CSSProperties
}

const NIGHT: GlobeTheme = {
  land: "#b9b9b9",
  arc: "#ff5b00",
  glow: "rgb(255 91 0 / 0.10)",
  disc: "rgba(255,255,255,0.035)",
  text: "#ffffff",
}

const RAD = Math.PI / 180
const ARC_STEPS = 48

export function RouteGlobe({
  hub,
  places,
  theme = NIGHT,
  motion = "full",
  onSelect,
  progress,
  className = "",
  style,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pinEls = useRef<(HTMLButtonElement | null)[]>([])
  const hubEl = useRef<HTMLDivElement>(null)
  // Set while a label is hovered or focused: the globe stops turning so the
  // label doesn't slide away from under the pointer.
  const hold = useRef(0)

  useEffect(() => {
    const el = host.current
    const cv = canvas.current
    if (!el || !cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const reduced = motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches
    const dots = landDots(window.innerWidth < 640 ? 14000 : 24000)
    const H = toVec(hub.lon, hub.lat)
    const routes = places.map((p, i) => ({ p, v: toVec(p.lon, p.lat), offset: i / places.length }))
    const st = {
      yaw: hub.lon * RAD - 0.35,
      tilt: 18 * RAD,
      vy: 0,
      vt: 0,
      drag: false,
      px: 0,
      py: 0,
      last: 0,
      idle: 0,
    }
    let W = 0
    let Hh = 0
    let dpr = 1
    let raf = 0
    let alive = true
    let visible = true
    const t0 = performance.now()
    const pinState: { x: number; y: number; z: number }[] = []

    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      W = el.clientWidth
      Hh = el.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(Hh * dpr)
    }
    // Opening pose: a giant globe of which only the top ~13% of the box's height
    // shows, peeking up from the bottom edge (the box fills the screen only once
    // the page is pinned, so it is not seen before). Resting pose: centred,
    // taking the box's whole height. In between it eases, so it keeps coming up.
    const frame = () => {
      const p0 = progress ? Math.max(0, Math.min(1, progress.get())) : 1
      const e = p0 * p0 * (3 - 2 * p0)
      const r0 = Math.min(W * 0.41, Hh * 0.7)
      const r1 = Math.min(W * 0.44, Hh * 0.45)
      const cy0 = Hh * 0.87 + r0
      return { r: r0 + (r1 - r0) * e, cy: cy0 + (Hh * 0.5 - cy0) * e, p: p0 }
    }
    const restRadius = () => Math.min(W * 0.44, Hh * 0.45)
    const project = (v: Vec3, lift: number, r: number, cx: number, cy: number) => {
      const [x, y, z] = rotate(v, st.yaw, st.tilt)
      return { x: cx + x * r * lift, y: cy - y * r * lift, z }
    }

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, Hh)
      const { r, cy, p: prog } = frame()
      const cx = W / 2
      // Labels only once the globe has nearly settled.
      const pinFade = Math.max(0, Math.min(1, (prog - 0.6) / 0.3))
      drawGlobe(ctx, dots, { cx, cy, r, yaw: st.yaw, tilt: st.tilt }, theme.land, Math.max(1.3, r / 160), theme.glow, theme.disc)
      const t = (now - t0) / 1000
      ctx.lineCap = "round"
      routes.forEach((rt, index) => {
        const ang = Math.acos(Math.max(-1, Math.min(1, H[0] * rt.v[0] + H[1] * rt.v[1] + H[2] * rt.v[2])))
        const height = 0.06 + ang * 0.12
        const pts: { x: number; y: number; z: number }[] = []
        for (let k = 0; k <= ARC_STEPS; k++) {
          const u = k / ARC_STEPS
          pts.push(project(slerp(H, rt.v, u), 1 + Math.sin(Math.PI * u) * height, r, cx, cy))
        }
        // The arc: faint where it passes behind the globe.
        ctx.strokeStyle = theme.arc
        ctx.lineWidth = 1.1
        for (let k = 0; k < ARC_STEPS; k++) {
          const a = pts[k]
          const b = pts[k + 1]
          const hidden = a.z < 0 && Math.hypot(a.x - cx, a.y - cy) < r
          ctx.globalAlpha = hidden ? 0.06 : 0.38
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        // The comet: a bright head with a fading tail, looping on its own offset.
        const cycle = 3.6
        const ph = reduced ? 0.999 : (t / cycle + rt.offset) % 1
        const run = Math.min(1, ph / 0.7)
        const head = Math.floor(run * ARC_STEPS)
        for (let k = Math.max(0, head - 10); k < head; k++) {
          const a = pts[k]
          const b = pts[k + 1]
          if (a.z < 0 && Math.hypot(a.x - cx, a.y - cy) < r) continue
          ctx.globalAlpha = (1 - (head - k) / 10) * 0.95
          ctx.lineWidth = 2.2
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        const end = pts[ARC_STEPS]
        const front = end.z > 0
        // Arrival pulse around the destination's dot (the dot itself is the
        // label's, an HTML element).
        if (front && ph > 0.7) {
          const k = (ph - 0.7) / 0.3
          ctx.globalAlpha = (1 - k) * 0.9
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(end.x, end.y, 4 + k * 16, 0, Math.PI * 2)
          ctx.stroke()
        }
        pinState[index] = { x: end.x, y: end.y, z: end.z }
      })
      // Slide each destination's label onto its dot. Labels that would sit on
      // top of one already placed (nearer the viewer wins) fold down to just
      // their dot, and open again while hovered or focused.
      const boxes: { l: number; t: number; r: number; b: number }[] = []
      // The hub's own label (not clickable) takes its place first.
      const hp = project(H, 1, r, cx, cy)
      const hubNode = hubEl.current
      if (hubNode) {
        const shownHub = hp.z > 0.08 && pinFade > 0.02
        hubNode.style.transform = `translate(${hp.x.toFixed(1)}px, ${hp.y.toFixed(1)}px)`
        hubNode.style.opacity = shownHub ? String(Math.min(1, hp.z * 5) * pinFade) : "0"
        hubNode.style.visibility = shownHub ? "visible" : "hidden"
        const hubLeft = hp.x > cx
        if (hubNode.classList.contains("rg__hub--left") !== hubLeft) hubNode.classList.toggle("rg__hub--left", hubLeft)
        if (shownHub) {
          const lab = hubNode.querySelector<HTMLElement>(".rg__label")
          const w = lab?.offsetWidth ?? 0
          const h = lab?.offsetHeight ?? 0
          const l = hubLeft ? hp.x - 18 - w : hp.x + 18
          boxes.push({ l, t: hp.y - 12, r: l + w, b: hp.y - 12 + h })
        }
      }
      const order = pinState
        .map((_, i) => i)
        .filter((i) => pinState[i].z > 0.08)
        .sort((a, b) => pinState[b].z - pinState[a].z)
      pinState.forEach((s, i) => {
        const pin = pinEls.current[i]
        if (!pin) return
        pin.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
        const shown = s.z > 0.08
        const on = shown && pinFade > 0.02
        pin.style.opacity = on ? String(Math.min(1, s.z * 5) * pinFade) : "0"
        pin.style.visibility = on ? "visible" : "hidden"
        // On the right half of the globe the label opens leftwards, so it
        // stays inside the box.
        const left = s.x > cx
        if (pin.classList.contains("rg__pin--left") !== left) pin.classList.toggle("rg__pin--left", left)
      })
      for (const i of order) {
        const pin = pinEls.current[i]
        const label = pin?.querySelector<HTMLElement>(".rg__label")
        if (!pin || !label) continue
        const s = pinState[i]
        const w = label.offsetWidth
        const h = label.offsetHeight
        const l = s.x > cx ? s.x - 16 - w : s.x + 16
        const box = { l, t: s.y - 12, r: l + w, b: s.y - 12 + h }
        const overlaps = boxes.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t)
        if (!overlaps) boxes.push(box)
        if (pin.classList.contains("rg__pin--dot") !== overlaps) pin.classList.toggle("rg__pin--dot", overlaps)
      }
      // The hub.
      const h = project(H, 1, r, cx, cy)
      if (h.z > 0) {
        ctx.globalAlpha = 1
        ctx.fillStyle = theme.text
        ctx.beginPath()
        ctx.arc(h.x, h.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3)
        ctx.strokeStyle = theme.text
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(h.x, h.y, 9, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const tick = (now: number) => {
      raf = 0
      if (!alive || !visible || document.hidden) return
      const dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 0.016
      st.last = now
      if (!st.drag) {
        st.yaw += st.vy * dt
        st.tilt += st.vt * dt
        st.vy *= Math.pow(0.05, dt)
        st.vt *= Math.pow(0.05, dt)
        if (!hold.current && now - st.idle > 2500) st.yaw += dt * 0.08
        st.tilt = Math.max(-0.9, Math.min(0.9, st.tilt + (18 * RAD - st.tilt) * Math.min(1, dt * 0.4)))
      }
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (reduced) return draw(performance.now())
      if (!raf && alive) {
        st.last = 0
        raf = requestAnimationFrame(tick)
      }
    }
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId)
      st.drag = true
      st.px = e.clientX
      st.py = e.clientY
      st.vy = st.vt = 0
    }
    const onMove = (e: PointerEvent) => {
      if (!st.drag) return
      const r = restRadius()
      const dx = e.clientX - st.px
      const dy = e.clientY - st.py
      st.px = e.clientX
      st.py = e.clientY
      st.yaw -= dx / r
      st.tilt = Math.max(-0.9, Math.min(0.9, st.tilt + dy / r))
      st.vy = (-dx / r) * 30
      st.vt = (dy / r) * 30
      st.idle = performance.now()
      if (reduced) draw(performance.now())
    }
    const onUp = () => {
      st.drag = false
      st.idle = performance.now()
    }
    cv.addEventListener("pointerdown", onDown)
    cv.addEventListener("pointermove", onMove)
    cv.addEventListener("pointerup", onUp)
    cv.addEventListener("pointercancel", onUp)
    // With reduced motion nothing animates by itself, so redraw on scroll.
    const offProgress = reduced ? progress?.on("change", () => draw(performance.now())) : undefined
    const ro = new ResizeObserver(() => {
      size()
      draw(performance.now())
    })
    ro.observe(el)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    io.observe(el)
    const onVis = () => !document.hidden && start()
    document.addEventListener("visibilitychange", onVis)
    size()
    start()
    return () => {
      alive = false
      offProgress?.()
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      cv.removeEventListener("pointerdown", onDown)
      cv.removeEventListener("pointermove", onMove)
      cv.removeEventListener("pointerup", onUp)
      cv.removeEventListener("pointercancel", onUp)
    }
  }, [hub, places, theme, motion, progress])

  return (
    <div ref={host} className={`rg ${className}`} style={style}>
      <canvas
        ref={canvas}
        className="rg__canvas"
        role="img"
        aria-label={`Un globo con ${places.length} ${places.length === 1 ? "tappa" : "tappe"} da ${hub.name}`}
      />
      <div ref={hubEl} className="rg__hub" aria-hidden="true">
        <span className="rg__label">
          <strong className="rg__title">{hub.name}</strong>
          <span className="rg__note">Partenza</span>
        </span>
      </div>
      {places.map((p, i) => (
        <button
          key={p.id}
          ref={(node) => {
            pinEls.current[i] = node
          }}
          type="button"
          className="rg__pin"
          aria-label={p.note ? `${p.name}, ${p.note}. Guarda il video` : `${p.name}. Guarda il video`}
          onPointerEnter={() => {
            hold.current += 1
          }}
          onPointerLeave={() => {
            hold.current = Math.max(0, hold.current - 1)
          }}
          onFocus={() => {
            hold.current += 1
          }}
          onBlur={() => {
            hold.current = Math.max(0, hold.current - 1)
          }}
          onClick={(e) => onSelect?.(p, e.currentTarget.querySelector(".rg__dot")!.getBoundingClientRect())}
        >
          <span className="rg__dot" aria-hidden="true" />
          <span className="rg__label">
            <strong className="rg__title">{p.name}</strong>
            {p.note && <span className="rg__note">{p.note}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

export default RouteGlobe
