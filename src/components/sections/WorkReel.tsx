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
/** Pure hold on the video's last (already-black) frame — scroll passes
 *  through this whole span with nothing changing on screen, before the
 *  carousel starts to appear. */
const BLACK_HOLD_VH = 150
const CAROUSEL_VH = 220
/** studio.mp4's actual duration (see video.duration, logged during dev). */
const VIDEO_DURATION = 8.0833

// Global scroll milestones (multiples of viewport height, same units as
// HERO_REVEAL_START/END), working forward from the shared reveal window.
const VIDEO_START_GLOBAL = HERO_REVEAL_END
const VIDEO_END_GLOBAL = VIDEO_START_GLOBAL + VIDEO_VH / 100
const HOLD_END_GLOBAL = VIDEO_END_GLOBAL + BLACK_HOLD_VH / 100
const CAROUSEL_END_GLOBAL = HOLD_END_GLOBAL + CAROUSEL_VH / 100
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
/** Reveal checkpoints, keyed to the video's own timestamp: 0% at 7.2s, 100%
 *  at 8s — same window, same ease, for every layer below, so the whole
 *  reveal stays scrubbed 1:1 with scroll instead of running on its own timer,
 *  matching how the video itself is driven. */
const FADE_KEYFRAME_SECONDS = [7.2, 8]
const FADE_KEYFRAME_OPACITY = [0, 1]
/** Heading settles in place (small rise), same as before. */
const HEADING_RISE_Y = [48, 0]
/** The video's own last frame is a dim, lit studio interior, not black — this
 *  is what actually gets the screen to "almost black" as the scrub finishes;
 *  the gallery then makes its entrance against that black, not the footage. */
const BLACKOUT_OPACITY = [0, 1]
/** Gallery makes a full screen-height entrance from off-screen below, rather
 *  than the heading's small settle-in-place rise. */
const GALLERY_RISE_Y = ["100%", "0%"]
const FADE_EASE = cubicBezier(...EASE_WAVE)
/** How much of the carousel's own scroll budget (CAROUSEL_VH) the entrance
 *  fade/rise itself consumes, once the video scrub is fully done. */
const ENTRANCE_FADE_VH = 40

// Pin-local scrollYProgress fractions where the video-scrub phase runs —
// starts at 0 since the pin's local progress begins exactly at the handoff.
const VIDEO_START_FRACTION = (VIDEO_START_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const VIDEO_END_FRACTION = (VIDEO_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** Where the black-hold span ends and the content block is allowed to start
 *  fading/rising in — BLACK_HOLD_VH of pure scroll after the video finishes,
 *  during which nothing on screen changes. The carousel's own card-scroll
 *  starts at that same instant, so nothing about the carousel moves or
 *  appears until the hold is over. */
const HOLD_END_FRACTION = (HOLD_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
const CAROUSEL_SCROLL_START = HOLD_END_FRACTION
const ENTRANCE_END_FRACTION = HOLD_END_FRACTION + (ENTRANCE_FADE_VH / 100) / PIN_SCROLL_VH

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
  // Blackout still tracks the video's own last second (finishes exactly as
  // the video scrub completes) — only the content block's own entrance
  // (below) waits for that to be done before it starts.
  const blackoutKeyframes = FADE_KEYFRAME_SECONDS.map((s) => s / VIDEO_DURATION)
  const blackoutOpacity = useTransform(videoProgress, blackoutKeyframes, BLACKOUT_OPACITY, { ease: [FADE_EASE] })
  const contentOpacity = useTransform(scrollYProgress, [HOLD_END_FRACTION, ENTRANCE_END_FRACTION], FADE_KEYFRAME_OPACITY, { ease: [FADE_EASE] })
  const headingY = useTransform(scrollYProgress, [HOLD_END_FRACTION, ENTRANCE_END_FRACTION], HEADING_RISE_Y, { ease: [FADE_EASE] })
  const galleryY = useTransform(scrollYProgress, [HOLD_END_FRACTION, ENTRANCE_END_FRACTION], GALLERY_RISE_Y, { ease: [FADE_EASE] })
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
