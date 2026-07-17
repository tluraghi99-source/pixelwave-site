import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"

// The video's reveal is a fixed overlay, not part of the pin's own document
// flow (see reel__reveal-overlay below) — it rides the same global
// HERO_REVEAL_START/END window (see lib/motion) that drives the hero mark's
// dock, so the iris and the logo move in exact lockstep from scroll 0. Only
// the video-scrub and carousel phases live inside the pin's own local
// scrollYProgress, which starts right where the overlay hands off.
const VIDEO_VH = 250
/** Pure hold on the video's last (still undimmed) frame — scroll passes
 *  through this whole short span with nothing changing on screen, before
 *  the black fade-in below starts. */
const FROZEN_HOLD_VH = 30
/** The black background's own fade-in — deliberately long and slow, scrubbed
 *  1:1 with scroll rather than time. The carousel begins its own entrance at
 *  80% through this span (see CAROUSEL_ENTRANCE_START_GLOBAL below), not at
 *  its end, and keeps fading in on its own past that point. */
const BLACK_FADE_VH = 200
const CAROUSEL_START_FRACTION_OF_FADE = 0.8
const CAROUSEL_VH = 220

// Global scroll milestones (multiples of viewport height, same units as
// HERO_REVEAL_START/END), working forward from the shared reveal window.
const VIDEO_START_GLOBAL = HERO_REVEAL_END
const VIDEO_END_GLOBAL = VIDEO_START_GLOBAL + VIDEO_VH / 100
const FROZEN_HOLD_END_GLOBAL = VIDEO_END_GLOBAL + FROZEN_HOLD_VH / 100
const BLACK_FADE_END_GLOBAL = FROZEN_HOLD_END_GLOBAL + BLACK_FADE_VH / 100
const CAROUSEL_ENTRANCE_START_GLOBAL =
  FROZEN_HOLD_END_GLOBAL + (BLACK_FADE_VH * CAROUSEL_START_FRACTION_OF_FADE) / 100
const CAROUSEL_END_GLOBAL = CAROUSEL_ENTRANCE_START_GLOBAL + CAROUSEL_VH / 100
/** The pin starts sticking at HERO_REVEAL_END — exactly where the fixed
 *  reveal overlay finishes opening and hands off — and has to run through
 *  CAROUSEL_END_GLOBAL — its CSS height is that spread of extra scroll, plus
 *  the one viewport height the sticky inner itself occupies while pinned.
 *  Keep .reel's height and .page-content's margin-top in index.css in sync
 *  with this (PIN_HEIGHT_VH below / HERO_REVEAL_END respectively). */
const PIN_HEIGHT_VH = (CAROUSEL_END_GLOBAL - HERO_REVEAL_END + 1) * 100
const PIN_SCROLL_VH = PIN_HEIGHT_VH / 100 - 1

/** The video arrives through a small centered window that expands outward to
 *  the full frame — a centered iris opening, driven by the exact same
 *  progress value as the hero mark's dock and the header logo's crossfade,
 *  so all three land together instead of merely "around the same time." */
const REVEAL_CLIP_START = "inset(45% 42% 45% 42%)"
const REVEAL_CLIP_END = "inset(0% 0% 0% 0%)"
/** Heading settles in place (small rise), same as before. */
const HEADING_RISE_START = 48
const HEADING_RISE_END = 0
const FADE_EASE = cubicBezier(...EASE_WAVE)
/** How much of the carousel's own scroll budget (CAROUSEL_VH) the entrance
 *  fade/rise itself consumes, once the video scrub is fully done. */
const ENTRANCE_FADE_VH = 40

/** Clamped 0→1 local progress of v within [start, end]. */
function clampedProgress(v: number, start: number, end: number) {
  if (end <= start) return v >= end ? 1 : 0
  return Math.min(1, Math.max(0, (v - start) / (end - start)))
}
function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

// Pin-local scrollYProgress fractions where the video-scrub phase runs —
// starts at 0 since the pin's local progress begins exactly at the handoff.
const VIDEO_START_FRACTION = (VIDEO_START_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const VIDEO_END_FRACTION = (VIDEO_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** Where the frozen hold ends and the black fade-in starts — the video's
 *  last frame stays fixed and undimmed for this whole span. */
const FROZEN_HOLD_END_FRACTION = (FROZEN_HOLD_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** Where the black fade-in itself finishes (opacity reaches 1). The carousel
 *  starts before this point (see CAROUSEL_SCROLL_START), not at it. */
const BLACK_FADE_END_FRACTION = (BLACK_FADE_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** The carousel's own entrance starts once the black fade-in is 80% of the
 *  way through — it keeps fading/rising in on its own past that point,
 *  independent of when the blackout itself finishes. */
const CAROUSEL_SCROLL_START = (CAROUSEL_ENTRANCE_START_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const ENTRANCE_END_FRACTION = CAROUSEL_SCROLL_START + (ENTRANCE_FADE_VH / 100) / PIN_SCROLL_VH

/** Desktop: the video's iris opens as a fixed overlay sitting directly on the
 *  hero (scroll 0 → HERO_REVEAL_END, in exact lockstep with the hero mark's
 *  dock), then hands off to a pinned section that scrubs the video to its
 *  last frame and holds it there while the same scroll drives the carousel
 *  on top of it. */
function WorkReelPinned() {
  const pinRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] })
  // Separate global scroll read (not pin-relative) so the iris rides the
  // exact same progress value as Hero's dock and Header's crossfade.
  const { scrollY } = useScroll()
  const vh = typeof window !== "undefined" ? window.innerHeight : 900

  const revealProgress = useTransform(scrollY, [vh * HERO_REVEAL_START, vh * HERO_REVEAL_END], [0, 1])
  const revealClip = useTransform(revealProgress, [0, 1], [REVEAL_CLIP_START, REVEAL_CLIP_END])
  // Hidden at the very top of the page (scroll 0) so the resting hero reads
  // as pure hero, no video sliver poking through — appears the instant any
  // scroll input happens, then opens for the rest of the window; disappears
  // the instant the pin takes over, so the swap is a same-frame, same-content
  // cut on that end too.
  const overlayVisible = useTransform(scrollY, (v) => (v > 0 && v < vh * HERO_REVEAL_END ? 1 : 0))
  const reelVisible = useTransform(scrollY, (v) => (v >= vh * HERO_REVEAL_END ? 1 : 0))
  // The overlay only ever shows the video's first frame — real scrubbing
  // starts only once the pin (below) takes over.
  const overlayProgress = useMotionValue(0)

  const videoProgress = useTransform(scrollYProgress, [VIDEO_START_FRACTION, VIDEO_END_FRACTION], [0, 1])
  const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, 1], [0, 1])
  // Frozen hold (video-end → FROZEN_HOLD_END_FRACTION): blackout stays at 0,
  // clamped by useTransform below its input range — the video's last frame
  // reads undimmed. The black fade-in itself then runs, scroll-linked, over
  // FROZEN_HOLD_END_FRACTION → BLACK_FADE_END_FRACTION.
  // Callback-form transforms with a manually-clamped lerp, not array-range
  // useTransform — array ranges have an established v12 bug in this codebase
  // where overlapping active domains fed to a shared/adjacent transform on
  // the same scrollYProgress produce a corrupted (decaying) DOM-rendered
  // value despite the underlying MotionValue reading correctly, once one
  // transform's active span overlaps another's (as blackout's and the
  // content entrance's now deliberately do, by spec). Callback form sidesteps
  // it entirely by doing the interpolation in plain JS.
  const blackoutOpacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, FROZEN_HOLD_END_FRACTION, BLACK_FADE_END_FRACTION))
  )
  const contentOpacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, CAROUSEL_SCROLL_START, ENTRANCE_END_FRACTION))
  )
  const headingY = useTransform(scrollYProgress, (v) =>
    lerp(HEADING_RISE_START, HEADING_RISE_END, FADE_EASE(clampedProgress(v, CAROUSEL_SCROLL_START, ENTRANCE_END_FRACTION)))
  )
  const galleryY = useTransform(scrollYProgress, (v) =>
    `${lerp(100, 0, FADE_EASE(clampedProgress(v, CAROUSEL_SCROLL_START, ENTRANCE_END_FRACTION)))}%`
  )
  const pointerEvents = useTransform(contentOpacity, (v) => (v > 0.05 ? "auto" : "none"))

  return (
    <>
      <motion.div className="reel__reveal-overlay" style={{ clipPath: revealClip, opacity: overlayVisible }}>
        <VideoScrubbed progress={overlayProgress} />
      </motion.div>
      <section id="work" className="reel" data-screen-label="Selected Work" ref={pinRef}>
        <motion.div className="reel__inner" style={{ opacity: reelVisible }}>
          <VideoScrubbed progress={videoProgress} />
          <motion.div className="reel__blackout" style={{ opacity: blackoutOpacity }} />
          <motion.div className="reel__content" data-theme="dark" style={{ pointerEvents }}>
            <div className="grain-overlay" aria-hidden="true" />
            <motion.div className="wrap" style={{ opacity: contentOpacity, y: headingY }}>
              <WorkHeading />
            </motion.div>
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery scrollYProgress={carouselProgress} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </>
  )
}

/** Mobile/tablet: the two pieces stay separate ambient sections, in the same order. */
function WorkReelAmbient() {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient />
    </>
  )
}

export function WorkReel() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? <WorkReelPinned /> : <WorkReelAmbient />
}
