import { useRef } from "react"
import { cubicBezier, motion, useMotionValue, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { EASE_WAVE, HERO_REVEAL_END, HERO_REVEAL_START } from "@/lib/motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { useProjects } from "@/hooks/useProjects"
import type { Project } from "@/lib/strapi"
import { VideoScrubbed, VideoScrubAmbient } from "@/components/sections/VideoScrub"
import { WorkHeading, WorkGallery, WorkAmbient } from "@/components/sections/Work"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Button } from "@/components/pw/Button"
import { CtaBand } from "@/components/sections/CtaBand"

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
 *  65% through this span (see CAROUSEL_ENTRANCE_START_GLOBAL below), not at
 *  its end, and keeps fading in on its own past that point. */
const BLACK_FADE_VH = 200
const CAROUSEL_START_FRACTION_OF_FADE = 0.65
const CAROUSEL_VH = 220
/** The blackout never goes fully opaque — it settles at a dimmed 60%, so the
 *  video's last frame stays faintly visible underneath rather than reading
 *  as pure black. */
const BLACKOUT_MAX_OPACITY = 0.6
/** Extra scroll, appended after the carousel's own cycling range, spent on
 *  fading the CTA in and then simply holding on it before the pin
 *  releases. The carousel's own entrance/cycling timing above is
 *  completely untouched by this — this only extends what comes after it. */
const CTA_VH = 120
/** How much of CTA_VH is spent fading in vs. just holding once visible. */
const CTA_FADE_VH = 50

// Global scroll milestones (multiples of viewport height, same units as
// HERO_REVEAL_START/END), working forward from the shared reveal window.
const VIDEO_START_GLOBAL = HERO_REVEAL_END
const VIDEO_END_GLOBAL = VIDEO_START_GLOBAL + VIDEO_VH / 100
const FROZEN_HOLD_END_GLOBAL = VIDEO_END_GLOBAL + FROZEN_HOLD_VH / 100
const BLACK_FADE_END_GLOBAL = FROZEN_HOLD_END_GLOBAL + BLACK_FADE_VH / 100
const CAROUSEL_ENTRANCE_START_GLOBAL =
  FROZEN_HOLD_END_GLOBAL + (BLACK_FADE_VH * CAROUSEL_START_FRACTION_OF_FADE) / 100
const CAROUSEL_END_GLOBAL = CAROUSEL_ENTRANCE_START_GLOBAL + CAROUSEL_VH / 100
/** Where the carousel's cycling range ends and the CTA's own trailing
 *  segment begins. */
const CTA_END_GLOBAL = CAROUSEL_END_GLOBAL + CTA_VH / 100
/** The pin starts sticking at HERO_REVEAL_END — exactly where the fixed
 *  reveal overlay finishes opening and hands off — and has to run through
 *  CTA_END_GLOBAL (carousel range + the new CTA range after it) — its CSS
 *  height is that spread of extra scroll, plus the one viewport height the
 *  sticky inner itself occupies while pinned. Keep .reel's height and
 *  .page-content's margin-top in index.css in sync with this (PIN_HEIGHT_VH
 *  below / HERO_REVEAL_END respectively). */
const PIN_HEIGHT_VH = (CTA_END_GLOBAL - HERO_REVEAL_END + 1) * 100
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
/** Where the carousel's own cycling range ends, re-expressed as a fraction
 *  of the pin's now-larger total (PIN_SCROLL_VH includes CTA_VH) — computed
 *  the same way every other fraction constant above is, off the same
 *  CAROUSEL_END_GLOBAL milestone, which itself hasn't changed. This is what
 *  carouselProgress maps to below instead of the literal "1" it used before
 *  CTA_VH existed — without it, the carousel's cycling would stretch across
 *  the newly-added CTA scroll range too, instead of finishing where it
 *  always has and leaving that range for the CTA. */
const CAROUSEL_CYCLE_END_FRACTION = (CAROUSEL_END_GLOBAL - HERO_REVEAL_END) / PIN_SCROLL_VH
/** Where the CTA's own fade-in finishes (opacity reaches 1) — it just holds
 *  at full opacity for the remainder of the pin after this. */
const CTA_FADE_END_FRACTION = CAROUSEL_CYCLE_END_FRACTION + (CTA_FADE_VH / 100) / PIN_SCROLL_VH

/** Desktop: the video's iris opens as a fixed overlay sitting directly on the
 *  hero (scroll 0 → HERO_REVEAL_END, in exact lockstep with the hero mark's
 *  dock), then hands off to a pinned section that scrubs the video to its
 *  last frame and holds it there while the same scroll drives the carousel
 *  on top of it. */
function WorkReelPinned({ ctaHeadline, projects }: { ctaHeadline: string; projects: Project[] }) {
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
  const carouselProgress = useTransform(scrollYProgress, [CAROUSEL_SCROLL_START, CAROUSEL_CYCLE_END_FRACTION], [0, 1])
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
    lerp(0, BLACKOUT_MAX_OPACITY, FADE_EASE(clampedProgress(v, FROZEN_HOLD_END_FRACTION, BLACK_FADE_END_FRACTION)))
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
  const ctaOpacity = useTransform(scrollYProgress, (v) =>
    FADE_EASE(clampedProgress(v, CAROUSEL_CYCLE_END_FRACTION, CTA_FADE_END_FRACTION))
  )
  // .reel__content's own pointerEvents above turns "auto" well before this
  // (once the heading/gallery are visible, ~0.6), but .reel__cta doesn't
  // fade in until CAROUSEL_CYCLE_END_FRACTION (~0.84) — without this, its
  // button would be clickable and tab-focusable while still fully
  // transparent, the only interactive element in the whole pin that isn't
  // gated by its own visibility.
  const ctaPointerEvents = useTransform(ctaOpacity, (v) => (v > 0.05 ? "auto" : "none"))
  const ctaVisibility = useTransform(ctaOpacity, (v) => (v > 0.05 ? "visible" : "hidden"))

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
            <motion.div className="wrap" style={{ opacity: contentOpacity, y: headingY }}>
              <WorkHeading />
            </motion.div>
            <motion.div className="work__gallery-wrap" style={{ opacity: contentOpacity, y: galleryY }}>
              <WorkGallery projects={projects} scrollYProgress={carouselProgress} />
            </motion.div>
            <motion.div
              className="reel__cta"
              style={{ opacity: ctaOpacity, pointerEvents: ctaPointerEvents, visibility: ctaVisibility }}
            >
              <SectionLabel>Let's talk</SectionLabel>
              <p className="reel__cta-headline">{ctaHeadline}</p>
              <Button
                variant="secondary"
                href="/contact"
                iconRight={<ArrowUpRight size={16} />}
                className="reel__cta-btn"
              >
                Start a project
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </>
  )
}

/** Mobile/tablet: the two pieces stay separate ambient sections, in the same
 *  order, with the CTA as its own standalone section right after — same
 *  place it's always been, just relocated here from HomePage.tsx so
 *  WorkReel owns "show the CTA" for both paths. */
function WorkReelAmbient({ ctaHeadline, projects }: { ctaHeadline: string; projects: Project[] }) {
  return (
    <>
      <VideoScrubAmbient />
      <WorkAmbient projects={projects} />
      <CtaBand headline={ctaHeadline} />
    </>
  )
}

export function WorkReel({ ctaHeadline }: { ctaHeadline: string }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  const projects = useProjects()

  return isDesktop ? (
    <WorkReelPinned ctaHeadline={ctaHeadline} projects={projects} />
  ) : (
    <WorkReelAmbient ctaHeadline={ctaHeadline} projects={projects} />
  )
}
