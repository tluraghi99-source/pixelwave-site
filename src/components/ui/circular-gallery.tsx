import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
  type OGLRenderingContext,
} from "ogl"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Tag } from "@/components/pw/Tag"

/* --------------------------------
 * Types
 ----------------------------------- */
export interface GalleryTag {
  variant?: ComponentProps<typeof Tag>["variant"]
  label: string
}

export interface GalleryItem {
  image: string
  text: string
  tags?: GalleryTag[]
  /** Present -> the card is clickable (a tap/click that isn't a drag fires
   *  onItemClick with this URL). Absent -> purely decorative, same as
   *  before (e.g. StudioGallery's atmosphere photos). */
  href?: string
}

export interface CircularGalleryHandle {
  /** progress: 0..1 across exactly one pass through the unique items. */
  setProgress: (progress: number) => void
}

interface CircularGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: GalleryItem[]
  /** Amount of curvature. Higher values create a stronger bend. @default 3 */
  bend?: number
  /** Border radius for the images, 0.0 to 0.5. @default 0.05 */
  borderRadius?: number
  /** Multiplier for manual drag interaction speed. @default 2 */
  scrollSpeed?: number
  /** Easing factor for the scroll animation (lower is smoother). @default 0.05 */
  scrollEase?: number
  /** Card width, in the same arbitrary units as cardHeight (not pixels —
   *  see Media.onResize). @default 933.333 (portrait, matches the homepage
   *  gallery's original proportions) */
  cardWidth?: number
  /** Card height, in the same arbitrary units as cardWidth. @default 1200 */
  cardHeight?: number
  /** Fires on a tap/click that isn't a drag, with that card's own `href` —
   *  only for cards that have one (see GalleryItem.href). Absent entirely
   *  -> every card stays purely decorative, same as before this existed. */
  onItemClick?: (href: string) => void
  /** Dims the hovered card (see HOVER_OPACITY) — off for purely decorative
   *  galleries with nothing to click through to. @default true */
  dimOnHover?: boolean
}

interface HoverInfo {
  index: number
  text: string
  tags?: GalleryTag[]
  href?: string
  rect: { left: number; top: number; width: number; height: number }
  /** Card's current tilt, in degrees, matching its on-screen rotation. */
  rotationDeg: number
}

/* --------------------------------
 * Helpers
 ----------------------------------- */
function debounce(func: (...args: unknown[]) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout>
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t
}

/** Total down-to-up movement, in pixels, below which a pointer gesture
 *  counts as a click/tap rather than a drag of the carousel. */
const CLICK_DRAG_THRESHOLD_PX = 6

/** How much a card dims (its own texture, via uOpacity — not a layer drawn
 *  on top of it) while hovered. */
const HOVER_OPACITY = 0.6

/** Below these, scroll position / hover-dim opacity are close enough to
 *  their targets that redrawing another frame would be imperceptible —
 *  used to decide when the render loop can stop (see App.update). */
const SCROLL_SETTLE_EPSILON = 0.01
const OPACITY_SETTLE_EPSILON = 0.001

// touchstart/touchmove have their position in `touches`; touchend's `touches`
// is already empty by the time it fires (the touch has ended) — its
// position lives in `changedTouches` instead. clientXOf/clientYOf cover the
// down/move case, clientEndXOf/clientEndYOf the up case; both fall back to
// plain MouseEvent clientX/clientY when `e` isn't a TouchEvent at all.
function clientXOf(e: MouseEvent | TouchEvent): number {
  return "touches" in e ? e.touches[0].clientX : e.clientX
}
function clientYOf(e: MouseEvent | TouchEvent): number {
  return "touches" in e ? e.touches[0].clientY : e.clientY
}
function clientEndXOf(e: MouseEvent | TouchEvent): number {
  return "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX
}
function clientEndYOf(e: MouseEvent | TouchEvent): number {
  return "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY
}

function autoBind(instance: object) {
  const proto = Object.getPrototypeOf(instance) as object
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue
    const value = (instance as Record<string, unknown>)[key]
    if (typeof value === "function") {
      ;(instance as Record<string, unknown>)[key] = value.bind(instance)
    }
  }
}

/* --------------------------------
 * OGL scene objects
 ----------------------------------- */
interface ScrollState {
  ease: number
  current: number
  target: number
  last: number
}

class Media {
  gl: OGLRenderingContext
  geometry: Plane
  image: string
  index: number
  length: number
  scene: Transform
  screen: { width: number; height: number }
  text: string
  tags?: GalleryTag[]
  href?: string
  viewport: { width: number; height: number }
  bend: number
  borderRadius: number
  cardWidth: number
  cardHeight: number
  program!: Program
  plane!: Mesh
  extra = 0
  widthTotal = 0
  width = 0
  x = 0
  scale = 1
  padding = 2
  speed = 0
  isBefore = false
  isAfter = false
  /** Eased toward targetOpacity every frame in update() — see App.setHoverOpacity. */
  opacity = 1
  targetOpacity = 1

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    scene,
    screen,
    text,
    tags,
    href,
    viewport,
    bend,
    borderRadius = 0,
    cardWidth,
    cardHeight,
  }: {
    geometry: Plane
    gl: OGLRenderingContext
    image: string
    index: number
    length: number
    scene: Transform
    screen: { width: number; height: number }
    text: string
    tags?: GalleryTag[]
    href?: string
    viewport: { width: number; height: number }
    bend: number
    borderRadius: number
    cardWidth: number
    cardHeight: number
  }) {
    this.geometry = geometry
    this.gl = gl
    this.image = image
    this.index = index
    this.length = length
    this.scene = scene
    this.screen = screen
    this.text = text
    this.tags = tags
    this.href = href
    this.viewport = viewport
    this.bend = bend
    this.borderRadius = borderRadius
    this.cardWidth = cardWidth
    this.cardHeight = cardHeight
    this.createShader()
    this.createMesh()
    this.onResize()
  }

  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: true })
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uOpacity;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);

          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);

          gl_FragColor = vec4(color.rgb, alpha * uOpacity);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        // [1, 1], not [0, 0]: matches the 1x1 white fallback canvas set as
        // the texture's initial image below, and keeps the fragment
        // shader's aspect-fit ratio (uPlaneSizes / uImageSizes) from
        // dividing by zero before a real image loads.
        uImageSizes: { value: [1, 1] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
        // Eased toward this.targetOpacity each frame (see update()) — the
        // hovered card dims instead of a dark layer sitting on top of it.
        uOpacity: { value: 1 },
      },
      transparent: true,
    })

    // A bare OGL Texture with no image renders solid black, which
    // disappears entirely against this gallery's dark backdrop whenever a
    // photo is loading or fails to load (e.g. the placeholder image host
    // being unreachable) — swap in a solid white 1x1 canvas so every card
    // stays visible as a plain white card until (or unless) its real photo
    // loads in and replaces it below.
    const fallback = document.createElement("canvas")
    fallback.width = 1
    fallback.height = 1
    fallback.getContext("2d")!.fillStyle = "#fff"
    fallback.getContext("2d")!.fillRect(0, 0, 1, 1)
    texture.image = fallback

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = this.image
    img.onload = () => {
      texture.image = img
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight]
    }
  }

  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program })
    this.plane.setParent(this.scene)
  }

  update(scroll: ScrollState, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra

    const x = this.plane.position.x
    const H = this.viewport.width / 2

    if (this.bend === 0) {
      this.plane.position.y = 0
      this.plane.rotation.z = 0
    } else {
      const bAbs = Math.abs(this.bend)
      const R = (H * H + bAbs * bAbs) / (2 * bAbs)
      const effectiveX = Math.min(Math.abs(x), H)
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX)

      if (this.bend > 0) {
        this.plane.position.y = -arc
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R)
      } else {
        this.plane.position.y = arc
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R)
      }
    }

    this.speed = scroll.current - scroll.last
    this.program.uniforms.uTime.value += 0.04
    this.program.uniforms.uSpeed.value = this.speed
    this.opacity = lerp(this.opacity, this.targetOpacity, 0.15)
    this.program.uniforms.uOpacity.value = this.opacity

    const planeOffset = this.plane.scale.x / 2
    const viewportOffset = this.viewport.width / 2
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset

    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal
      this.isBefore = this.isAfter = false
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal
      this.isBefore = this.isAfter = false
    }
  }

  onResize({
    screen,
    viewport,
  }: { screen?: { width: number; height: number }; viewport?: { width: number; height: number } } = {}) {
    if (screen) this.screen = screen
    if (viewport) this.viewport = viewport
    // Card size, in the same units as screen.height at scale 1 — this.cardWidth/
    // cardHeight come from the CircularGallery props (see their doc comments
    // for the default portrait proportions).
    this.scale = this.screen.height / 1500
    this.plane.scale.y = (this.viewport.height * (this.cardHeight * this.scale)) / this.screen.height
    this.plane.scale.x = (this.viewport.width * (this.cardWidth * this.scale)) / this.screen.width
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y]
    this.padding = 2
    this.width = this.plane.scale.x + this.padding
    this.widthTotal = this.width * this.length
    this.x = this.width * this.index
  }
}

class App {
  container: HTMLElement
  scrollSpeed: number
  scroll: ScrollState
  onCheckDebounce: () => void
  onHover?: (hover: HoverInfo | null) => void
  onItemClick?: (href: string) => void
  dimOnHover: boolean
  renderer!: Renderer
  gl!: OGLRenderingContext
  camera!: Camera
  scene!: Transform
  planeGeometry!: Plane
  mediasImages!: GalleryItem[]
  medias!: Media[]
  isDown = false
  start = 0
  startY = 0
  dragStartOffset = 0
  /** Manual drag nudge — separate from the externally (scroll-)driven offset. */
  manualOffset = 0
  /** Set from outside (e.g. page-scroll progress). */
  externalOffset = 0
  screen!: { width: number; height: number }
  viewport!: { width: number; height: number }
  raf!: number
  /** Last known pointer position, in container-local pixels; null when not hovering. */
  mouse: { x: number; y: number } | null = null
  hoveredIndex: number | null = null
  boundOnResize!: () => void
  boundOnTouchDown!: (e: MouseEvent | TouchEvent) => void
  boundOnTouchMove!: (e: MouseEvent | TouchEvent) => void
  boundOnTouchUp!: (e: MouseEvent | TouchEvent) => void
  boundOnPointerMove!: (e: MouseEvent) => void
  boundOnPointerLeave!: () => void

  constructor(
    container: HTMLElement,
    {
      items,
      bend,
      borderRadius,
      scrollSpeed,
      scrollEase,
      cardWidth,
      cardHeight,
      onHover,
      onItemClick,
      dimOnHover,
    }: {
      items?: GalleryItem[]
      bend: number
      borderRadius: number
      scrollSpeed: number
      scrollEase: number
      cardWidth: number
      cardHeight: number
      onHover?: (hover: HoverInfo | null) => void
      onItemClick?: (href: string) => void
      dimOnHover: boolean
    }
  ) {
    this.container = container
    this.scrollSpeed = scrollSpeed
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 }
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200)
    this.onHover = onHover
    this.onItemClick = onItemClick
    this.dimOnHover = dimOnHover

    autoBind(this)

    this.createRenderer()
    this.createCamera()
    this.createScene()
    this.onResize()
    this.createGeometry()
    this.createMedias(items, bend, borderRadius, cardWidth, cardHeight)
    this.startLoop()
    this.addEventListeners()
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) })
    this.gl = this.renderer.gl
    this.gl.clearColor(0, 0, 0, 0)
    this.container.appendChild(this.gl.canvas)
  }

  createCamera() {
    this.camera = new Camera(this.gl)
    this.camera.fov = 45
    this.camera.position.z = 20
  }

  createScene() {
    this.scene = new Transform()
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 })
  }

  createMedias(
    items: GalleryItem[] | undefined,
    bend: number,
    borderRadius: number,
    cardWidth: number,
    cardHeight: number
  ) {
    const defaultItems: GalleryItem[] = [
      { image: `https://picsum.photos/seed/1/800/600?grayscale`, text: "Bridge" },
      { image: `https://picsum.photos/seed/2/800/600?grayscale`, text: "Desk Setup" },
      { image: `https://picsum.photos/seed/3/800/600?grayscale`, text: "Waterfall" },
    ]

    const galleryItems = items && items.length > 0 ? items : defaultItems
    this.mediasImages = [...galleryItems, ...galleryItems]
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        tags: data.tags,
        href: data.href,
        viewport: this.viewport,
        bend,
        borderRadius,
        cardWidth,
        cardHeight,
      })
    })
  }

  /** progress: 0..1 across one pass through the unique (non-duplicated) items. */
  setProgress(progress: number) {
    const total = this.medias?.[0]?.widthTotal ?? 0
    this.externalOffset = progress * (total / 2)
    this.scroll.target = this.externalOffset + this.manualOffset
    this.startLoop()
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true
    this.dragStartOffset = this.manualOffset
    this.start = clientXOf(e)
    this.startY = clientYOf(e)
    this.startLoop()
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return
    const x = clientXOf(e)
    const distance = (this.start - x) * (this.scrollSpeed * 0.025)
    this.manualOffset = this.dragStartOffset + distance
    this.scroll.target = this.externalOffset + this.manualOffset
    this.startLoop()
  }

  onTouchUp(e: MouseEvent | TouchEvent) {
    this.isDown = false

    // A tap/click, not a drag — the down/up positions barely moved. Hit-test
    // fresh at the up position rather than reusing this.hoveredIndex: that's
    // only ever populated for fine pointers (see onPointerMove's early
    // return on coarse/touch input below), so it'd never fire on touch.
    const endX = clientEndXOf(e)
    const endY = clientEndYOf(e)
    const moved = Math.hypot(endX - this.start, endY - this.startY)
    let navigated = false
    if (moved <= CLICK_DRAG_THRESHOLD_PX && this.onItemClick) {
      const rect = this.container.getBoundingClientRect()
      const hit = this.hitTest(endX - rect.left, endY - rect.top)
      if (hit?.href) {
        this.onItemClick(hit.href)
        navigated = true
      }
    }

    // Skip the snap-to-center correction when the tap just navigated away —
    // re-centering a gallery on the page the visitor is leaving is a
    // pointless, visible jump right as the tap registers. Still runs for
    // every other release (a plain tap that missed a card, or a drag) so
    // the gallery settles on a card as before.
    if (!navigated) this.onCheck()
  }

  onCheck() {
    if (!this.medias?.[0]) return
    const width = this.medias[0].width
    const relative = this.scroll.target - this.externalOffset
    const itemIndex = Math.round(Math.abs(relative) / width)
    const snapped = width * itemIndex
    this.manualOffset = relative < 0 ? -snapped : snapped
    this.scroll.target = this.externalOffset + this.manualOffset
    this.startLoop()
  }

  /** Only meaningful for real pointers — coarse (touch) devices have no hover concept. */
  onPointerMove(e: MouseEvent) {
    if (window.matchMedia("(pointer: coarse)").matches) return
    const rect = this.container.getBoundingClientRect()
    this.mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    // Hover detection itself only runs inside update() (see updateHover),
    // so once the loop has settled and stopped, moving onto a new card
    // needs this to kick it awake again — otherwise the hover dim/caption
    // would freeze at whatever it last was.
    this.startLoop()
  }

  onPointerLeave() {
    this.mouse = null
  }

  /** Hit-test a container-local pixel position against each media's current
   *  on-screen rect. Shared by updateHover (continuous, fine-pointer-only)
   *  and onTouchUp's click detection (one-off, any pointer type). */
  hitTest(mouseX: number, mouseY: number): Media | null {
    if (!this.medias) return null
    const ratio = this.screen.width / this.viewport.width

    for (const media of this.medias) {
      const centerX = this.screen.width / 2 + media.plane.position.x * ratio
      const centerY = this.screen.height / 2 - media.plane.position.y * ratio
      const halfW = (media.plane.scale.x * ratio) / 2
      const halfH = (media.plane.scale.y * ratio) / 2
      if (Math.abs(mouseX - centerX) <= halfW && Math.abs(mouseY - centerY) <= halfH) {
        return media
      }
    }
    return null
  }

  /** Dims the hovered card's own texture (targetOpacity, eased in Media.update)
   *  instead of drawing anything on top of it — every other card stays full
   *  opacity. No-op when dimOnHover is off (purely decorative galleries). */
  setHoverOpacity(index: number | null) {
    if (!this.dimOnHover) return
    this.medias?.forEach((m) => {
      m.targetOpacity = m.index === index ? HOVER_OPACITY : 1
    })
  }

  /** Hit-test the last known pointer position against each media's current on-screen rect. */
  updateHover() {
    if (!this.onHover) return
    if (!this.mouse || !this.medias) {
      if (this.hoveredIndex !== null) {
        this.hoveredIndex = null
        this.setHoverOpacity(null)
        this.onHover(null)
      }
      return
    }

    const ratio = this.screen.width / this.viewport.width
    const hit = this.hitTest(this.mouse.x, this.mouse.y)

    if (!hit) {
      if (this.hoveredIndex !== null) {
        this.hoveredIndex = null
        this.setHoverOpacity(null)
        this.onHover(null)
      }
      return
    }

    const centerX = this.screen.width / 2 + hit.plane.position.x * ratio
    const centerY = this.screen.height / 2 - hit.plane.position.y * ratio
    const halfW = (hit.plane.scale.x * ratio) / 2
    const halfH = (hit.plane.scale.y * ratio) / 2

    if (this.hoveredIndex !== hit.index) {
      this.hoveredIndex = hit.index
      this.setHoverOpacity(hit.index)
    }
    this.onHover({
      index: hit.index,
      text: hit.text,
      tags: hit.tags,
      href: hit.href,
      rect: {
        left: centerX - halfW,
        top: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
      },
      // World rotation is CCW around the camera-facing axis; screen space is Y-flipped
      // relative to world space, which reverses the apparent sense of rotation.
      rotationDeg: (-hit.plane.rotation.z * 180) / Math.PI,
    })
  }

  onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight }
    this.renderer.setSize(this.screen.width, this.screen.height)
    this.camera.perspective({ aspect: this.screen.width / this.screen.height })
    const fov = (this.camera.fov * Math.PI) / 180
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z
    const width = height * this.camera.aspect
    this.viewport = { width, height }
    if (this.medias) {
      this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }))
    }
    // Recomputing screen/viewport doesn't render on its own — if the loop
    // had already settled and stopped, a resize (e.g. rotating the device)
    // would otherwise leave the canvas showing a stale frame at the old size.
    this.startLoop()
  }

  /** Schedules update() if it isn't already scheduled — a no-op while a
   *  frame is already pending, so callers can call this freely without
   *  double-scheduling. */
  startLoop() {
    if (this.raf) return
    this.raf = window.requestAnimationFrame(this.update)
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease)
    const direction = this.scroll.current > this.scroll.last ? "right" : "left"
    let unsettled = Math.abs(this.scroll.target - this.scroll.current) > SCROLL_SETTLE_EPSILON
    if (this.medias) {
      this.medias.forEach((media) => {
        media.update(this.scroll, direction)
        if (Math.abs(media.targetOpacity - media.opacity) > OPACITY_SETTLE_EPSILON) unsettled = true
      })
    }
    this.updateHover()
    this.renderer.render({ scene: this.scene, camera: this.camera })
    this.scroll.last = this.scroll.current
    // Dragging keeps going regardless of the epsilon checks above — a held,
    // motionless drag has nothing left to settle but must stay ready for
    // the next onTouchMove. Otherwise, once scroll and every card's hover
    // dim have caught up to their targets, further frames would be
    // pixel-identical — stop, rather than rendering this WebGL scene at
    // 60fps forever. setProgress/onTouch*/onPointerMove/onResize above all
    // call startLoop() to wake it back up when something actually changes.
    if (unsettled || this.isDown) {
      this.raf = window.requestAnimationFrame(this.update)
    } else {
      this.raf = 0
    }
  }

  addEventListeners() {
    this.boundOnResize = this.onResize
    this.boundOnTouchDown = this.onTouchDown
    this.boundOnTouchMove = this.onTouchMove
    this.boundOnTouchUp = this.onTouchUp
    this.boundOnPointerMove = this.onPointerMove
    this.boundOnPointerLeave = this.onPointerLeave

    // Deliberately no wheel listener: this gallery lives in a page-scroll-driven
    // (pinned) section, so a wheel listener here would double-count the same
    // scroll gesture. Direct drag is a distinct gesture, so it's safe to layer
    // on top as a secondary way to nudge the gallery.
    window.addEventListener("resize", this.boundOnResize)
    this.container.addEventListener("mousedown", this.boundOnTouchDown)
    window.addEventListener("mousemove", this.boundOnTouchMove)
    window.addEventListener("mouseup", this.boundOnTouchUp)
    this.container.addEventListener("touchstart", this.boundOnTouchDown)
    window.addEventListener("touchmove", this.boundOnTouchMove)
    window.addEventListener("touchend", this.boundOnTouchUp)
    this.container.addEventListener("mousemove", this.boundOnPointerMove)
    this.container.addEventListener("mouseleave", this.boundOnPointerLeave)
  }

  destroy() {
    window.cancelAnimationFrame(this.raf)
    window.removeEventListener("resize", this.boundOnResize)
    this.container.removeEventListener("mousedown", this.boundOnTouchDown)
    window.removeEventListener("mousemove", this.boundOnTouchMove)
    window.removeEventListener("mouseup", this.boundOnTouchUp)
    this.container.removeEventListener("touchstart", this.boundOnTouchDown)
    window.removeEventListener("touchmove", this.boundOnTouchMove)
    window.removeEventListener("touchend", this.boundOnTouchUp)
    this.container.removeEventListener("mousemove", this.boundOnPointerMove)
    this.container.removeEventListener("mouseleave", this.boundOnPointerLeave)

    if (this.renderer?.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas)
    }
  }
}

/* --------------------------------
 * React component
 ----------------------------------- */
export const CircularGallery = forwardRef<CircularGalleryHandle, CircularGalleryProps>(function CircularGallery(
  {
    items,
    bend = 3,
    borderRadius = 0.05,
    scrollSpeed = 2,
    scrollEase = 0.05,
    cardWidth = 933.333,
    cardHeight = 1200,
    onItemClick,
    dimOnHover = true,
    className,
    ...props
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<App | null>(null)
  const hoveredIndexRef = useRef<number | null>(null)
  const [hoveredContent, setHoveredContent] = useState<{ text: string; tags?: GalleryTag[] } | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (progress: number) => appRef.current?.setProgress(progress),
    }),
    []
  )

  useEffect(() => {
    if (!containerRef.current) return

    const app = new App(containerRef.current, {
      items,
      bend,
      borderRadius,
      scrollSpeed,
      scrollEase,
      cardWidth,
      cardHeight,
      onItemClick,
      dimOnHover,
      onHover: (hover) => {
        // Canvas-rendered cards give no native cursor cue that one is
        // clickable — swap in a pointer over any card with an href,
        // independent of the caption logic below (a card could in
        // principle have an href but no text/tags to caption).
        if (containerRef.current) {
          containerRef.current.style.cursor = hover?.href ? "pointer" : ""
        }
        const caption = captionRef.current
        if (!caption) return
        if (!hover || (!hover.text && !hover.tags?.length)) {
          caption.style.opacity = "0"
          if (hoveredIndexRef.current !== null) {
            hoveredIndexRef.current = null
            setHoveredContent(null)
          }
          return
        }
        caption.style.opacity = "1"
        caption.style.left = `${hover.rect.left}px`
        caption.style.top = `${hover.rect.top}px`
        caption.style.width = `${hover.rect.width}px`
        caption.style.height = `${hover.rect.height}px`
        caption.style.transform = `rotate(${hover.rotationDeg}deg)`
        if (hoveredIndexRef.current !== hover.index) {
          hoveredIndexRef.current = hover.index
          setHoveredContent({ text: hover.text, tags: hover.tags })
        }
      },
    })
    appRef.current = app

    return () => {
      appRef.current = null
      app.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, bend, borderRadius, scrollSpeed, scrollEase, cardWidth, cardHeight])

  return (
    <div className={cn("relative h-full w-full", className)} {...props}>
      <div ref={containerRef} className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing" />
      <div ref={captionRef} className="gallery-caption" data-theme="dark" style={{ opacity: 0 }}>
        {hoveredContent ? (
          <>
            <p className="gallery-caption__title">{hoveredContent.text}</p>
            {hoveredContent.tags && hoveredContent.tags.length > 0 ? (
              <div className="gallery-caption__tags">
                {hoveredContent.tags.map((tag, i) => (
                  <Tag key={i} variant={tag.variant}>
                    {tag.label}
                  </Tag>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
})
