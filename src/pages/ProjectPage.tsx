import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { useProjects } from "@/hooks/useProjects"
import { usePageMeta } from "@/hooks/usePageMeta"
import { useVideoFrames } from "@/hooks/useVideoFrames"
import { projectThumbUrl, type Project } from "@/lib/strapi"

type MediaItem = { type: "image"; src: string } | { type: "video"; src: string } | { type: "youtube"; videoId: string }

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

/** Extracts an 11-character YouTube video id from any normal URL shape
 *  editors are likely to paste: a watch URL (`?v=ID`, optionally with
 *  other query params before/after), a shortened youtu.be/ID link, or an
 *  existing /embed/ID link. Returns null on anything else, so callers can
 *  fail soft to the placeholder image rather than rendering a broken
 *  embed. */
function parseYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?(?:.*&)?v=))([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

/** Builds the hero/gallery/thumb media fields for one project, falling back
 *  to today's exact Picsum placeholder patterns wherever Strapi's media
 *  fields are empty. heroMediaType (not mime-sniffing) now decides whether
 *  hero is an image, a video, or a YouTube embed — an unparseable/empty
 *  heroYoutubeUrl for a "youtube" project falls back to the placeholder
 *  image, same as an empty heroMedia does for "image"/"video". */
function withMedia(p: Project): ProjectWithMedia {
  const placeholderHero: MediaItem = {
    type: "image",
    src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale`,
  }

  let hero: MediaItem
  if (p.heroMediaType === "youtube") {
    const videoId = p.heroYoutubeUrl ? parseYoutubeId(p.heroYoutubeUrl) : null
    hero = videoId ? { type: "youtube", videoId } : placeholderHero
  } else if (p.heroMediaType === "video") {
    hero = p.heroMedia ? { type: "video", src: p.heroMedia.url } : placeholderHero
  } else {
    hero = p.heroMedia ? { type: "image", src: p.heroMedia.url } : placeholderHero
  }

  const gallery: MediaItem[] =
    p.galleryImages.length > 0
      ? p.galleryImages.map((m) => ({
          type: m.mime.startsWith("video/") ? ("video" as const) : ("image" as const),
          src: m.url,
        }))
      : Array.from({ length: 8 }, (_, i) => ({
          type: "image" as const,
          src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
        }))

  // Used only as a static <img> "next project" teaser (and, via the same
  // logic, WorkPage.tsx's grid thumbnail — see gridThumbUrl there). Chain:
  // cover -> heroMedia (only when it's an image) -> Picsum placeholder.
  // Never a video or YouTube embed here, regardless of heroMediaType — a
  // small teaser/grid card is never a sensible place to autoplay either.
  const thumb = projectThumbUrl(p, `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`)

  return { ...p, hero, gallery, thumb }
}

/** Small "Overview" label, paired with the year on its first appearance only —
 *  this page shows the same overview text twice (split by the pinned video
 *  section between them), so the second appearance omits the year. */
function ProjectMeta({ year }: { year?: number }) {
  return (
    <div className="project-meta">
      <span className="project-meta__label">Overview</span>
      {year ? <span className="project-meta__label">{year}</span> : null}
    </div>
  )
}

/** `muted` defaults to true so every call site that never passes it (the
 *  gallery rows below, the mobile/tablet ambient hero) keeps today's
 *  silent-autoplay behavior unchanged — only ProjectVideoPinned's own hero
 *  wires up the unmute button and actually flips this. */
function ProjectMedia({ media, muted = true }: { media: MediaItem; muted?: boolean }) {
  // YouTube has no `muted` prop of its own — enablejsapi=1 (added below)
  // lets the already-embedded player accept postMessage commands without
  // loading the separate iframe_api script, so toggling `muted` re-sends
  // the matching mute/unMute command whenever it changes.
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (media.type !== "youtube") return
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }),
      "*"
    )
  }, [media.type, muted])

  if (media.type === "video") {
    return <video className="project-video-media" src={media.src} autoPlay loop muted={muted} playsInline />
  }
  if (media.type === "youtube") {
    // playlist={videoId} is the documented trick that makes a *single*
    // video loop via the embed player (YouTube's loop param alone only
    // loops actual playlists). controls=0 keeps it chromeless, matching
    // the plain <video>'s look; this is a best-effort approximation of
    // autoplay/loop/mute, not scroll-scrubbable like a real <video>
    // element (accepted trade-off — see the design spec).
    return (
      <iframe
        ref={iframeRef}
        className="project-video-media"
        src={`https://www.youtube.com/embed/${media.videoId}?autoplay=1&mute=1&loop=1&playlist=${media.videoId}&controls=0&playsinline=1&enablejsapi=1`}
        title="Project video"
        allow="autoplay"
      />
    )
  }
  return <img className="project-video-media" src={media.src} alt="" />
}

// VIDEO_PIN_HEIGHT_VH drives the pin wrapper's height directly via an inline
// style below (not a separately hand-synced CSS rule, unlike WorkReel's
// .reel — there's no other consumer of this number to keep in sync with).
// Unlike WorkReel's pin, this one needs no useScroll/useTransform at
// all — there's no scroll-scrubbed opacity or crossfade, the video just
// autoplays and loops in place. The sticky+height combo alone produces the
// "locks while scrolling through, releases once the wrapper's extra height
// runs out" behavior.
const VIDEO_HOLD_VH = 120
const VIDEO_PIN_HEIGHT_VH = VIDEO_HOLD_VH + 100

function ProjectVideoPinned({ media }: { media: MediaItem }) {
  const pinRef = useRef<HTMLElement>(null)
  // Starts muted, same as before this existed — the button only ever makes
  // an already-autoplaying video louder, never changes whether it plays.
  const [muted, setMuted] = useState(true)
  const hasSound = media.type === "video" || media.type === "youtube"

  function handleSkip() {
    const el = pinRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight
    window.scrollTo({ top })
  }

  return (
    <section
      className="project-video-pin"
      data-screen-label="Project Video"
      ref={pinRef}
      style={{ height: `${VIDEO_PIN_HEIGHT_VH}vh` }}
    >
      <div className="project-video-pin__inner">
        <ProjectMedia media={media} muted={muted} />
        <div className="project-video-pin__controls">
          {hasSound && (
            <button
              type="button"
              className="project-video-pin__mute"
              aria-pressed={!muted}
              aria-label={muted ? "Unmute" : "Mute"}
              title={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className="project-video-pin__skip" onClick={handleSkip}>
            Skip
          </button>
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — the video/image just renders as a plain full-width
 *  block in normal document flow, same fallback shape every other pinned
 *  desktop section on this site already uses (see WorkReel.tsx). Still gets
 *  its own mute button, same as the desktop pin — a self-hosted or YouTube
 *  hero autoplays muted either way, and mobile visitors had no way to turn
 *  the sound on before this. No Skip button here: that only ever skips past
 *  the desktop pin's scroll-lock, which doesn't exist in this plain-flow
 *  layout. */
function ProjectVideoAmbient({ media }: { media: MediaItem }) {
  const [muted, setMuted] = useState(true)
  const hasSound = media.type === "video" || media.type === "youtube"

  return (
    <div className="project-video-ambient" data-screen-label="Project Video">
      <ProjectMedia media={media} muted={muted} />
      {hasSound && (
        <div className="project-video-pin__controls">
          <button
            type="button"
            className="project-video-pin__mute"
            aria-pressed={!muted}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  )
}

function ProjectVideo({ media }: { media: MediaItem }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <ProjectVideoPinned media={media} /> : <ProjectVideoAmbient media={media} />
}

// Hover used to be a plain CSS animation-duration swap on :hover, which
// looks like it should ease into a slower speed but doesn't: a CSS
// animation's phase is elapsed-time / duration, and elapsed time keeps
// counting from when the animation started, not from the moment duration
// changes — so swapping to a longer duration recomputes the phase against
// the *same* elapsed time and visibly snaps to a different point in the
// loop. The Web Animations API's playbackRate doesn't have this problem:
// it scales time going forward from *now*, so the current visual position
// carries over exactly and it reads as easing down, not snapping.
const GALLERY_HOVER_RATE = 0.15

function GalleryRow({ items, reverse }: { items: MediaItem[]; reverse: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)

  function setHovered(hovered: boolean) {
    // A tap on a touch device fires a synthetic mouseenter without a
    // reliable matching mouseleave, which would otherwise stick this
    // carousel at its slowed-down rate until tapped elsewhere — a hover
    // affordance that isn't intuitive on a touchscreen to begin with, since
    // there's no pointer resting on it between taps. Real hover pointers
    // only (same check WorkMedia's tilt effect above uses).
    if (window.matchMedia("(pointer: coarse)").matches) return
    for (const anim of trackRef.current?.getAnimations() ?? []) {
      anim.playbackRate = hovered ? GALLERY_HOVER_RATE : 1
    }
  }

  // Duplicated once so the CSS animation can translate exactly -50% and loop
  // seamlessly — same technique as Marquee.tsx. Each half is wrapped in its
  // own flex group; the per-item gap lives in each item's own trailing
  // margin (see .project-gallery__item in index.css) rather than the track's
  // flex `gap`, so the two groups' rendered widths already include their own
  // connecting gap and a -50% translate lands exactly on one group's width.
  const renderItems = (keyPrefix: string) =>
    items.map((item, i) => (
      <div className="project-gallery__item" key={`${keyPrefix}-${i}`}>
        {item.type === "video" ? (
          <video src={item.src} autoPlay loop muted playsInline />
        ) : item.type === "image" ? (
          <img src={item.src} alt="" loading="lazy" />
        ) : null}
      </div>
    ))

  return (
    <div className="project-gallery__row">
      <div
        ref={trackRef}
        className={`project-gallery__track${reverse ? " project-gallery__track--ltr" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="project-gallery__group">{renderItems("a")}</div>
        <div className="project-gallery__group" aria-hidden="true">{renderItems("b")}</div>
      </div>
    </div>
  )
}

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const projects = useProjects()

  const { project, nextProject } = useMemo(() => {
    const index = projects.findIndex((p) => p.slug === slug)
    if (index === -1) return { project: undefined, nextProject: undefined }
    return {
      project: withMedia(projects[index]),
      nextProject: withMedia(projects[(index + 1) % projects.length]),
    }
  }, [projects, slug])

  // Called unconditionally, above the not-found return below, so hook order
  // never changes across renders — falls back to the site-wide title/desc
  // while `projects` is still loading or the slug genuinely doesn't match.
  usePageMeta(project ? `${project.title} — PixellWave` : "PixellWave — Your Vision, Our Wave", project?.desc)

  // No uploaded gallery + a self-hosted video hero: fill the carousel with
  // stills grabbed from that video instead of stock placeholders. While
  // they're being extracted the gallery stays hidden (no placeholder flash);
  // if extraction fails it falls back to the placeholders in project.gallery.
  const framesSrc =
    project && project.galleryImages.length === 0 && project.hero.type === "video" ? project.hero.src : null
  const videoFrames = useVideoFrames(framesSrc, 8)
  const galleryItems: MediaItem[] =
    !project
      ? []
      : framesSrc && videoFrames.status === "ready"
        ? videoFrames.frames.map((src) => ({ type: "image" as const, src }))
        : framesSrc && (videoFrames.status === "loading" || videoFrames.status === "idle")
          ? []
          : project.gallery

  if (!project || !nextProject) {
    return (
      <>
        <main className="project-page" data-theme="dark">
          <div className="wrap project-page__not-found">
            <p className="lead">Project not found.</p>
            <Link to="/work">Back to all projects →</Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main className="project-page" data-theme="dark">
        <div className="project-page__hero-glow">
          <CursorGlow className="cursor-glow" variant="dark" glow />
          <div className="wrap project-overview" data-screen-label="Project Info">
            <Reveal>
              <Link to="/work" className="project-back">
                ← All projects
              </Link>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="project-page__title">{project.title}</h1>
            </Reveal>
            <Reveal delay={0.1}>
              <ProjectMeta year={project.year} />
            </Reveal>
            <Reveal delay={0.15}>
              <p className="secbody">{project.desc}</p>
            </Reveal>
          </div>
        </div>

        <ProjectVideo media={project.hero} />

        <div className="project-page__body-glow">
          <CursorGlow className="cursor-glow" variant="dark" glow={false} />
          <div className="wrap project-overview" data-screen-label="Project Overview">
            <Reveal>
              <ProjectMeta />
            </Reveal>
            <Reveal delay={0.05}>
              <p className="secbody">{project.bodyDesc}</p>
            </Reveal>
          </div>

          {galleryItems.length > 0 && (
            <RevealGroup className="project-gallery" stagger={0.1} data-screen-label="Project Gallery">
              <RevealItem>
                <GalleryRow items={galleryItems.slice(0, Math.ceil(galleryItems.length / 2))} reverse={false} />
              </RevealItem>
              {galleryItems.length > 1 && (
                <RevealItem>
                  <GalleryRow items={galleryItems.slice(Math.ceil(galleryItems.length / 2))} reverse={true} />
                </RevealItem>
              )}
            </RevealGroup>
          )}

          <Reveal>
            <Link to={`/work/${nextProject.slug}`} className="project-next wrap" data-screen-label="Next Project">
              <div>
                <span className="project-next__label">Next project</span>
                <span className="project-next__title">
                  {nextProject.title} <ArrowUpRight size={28} />
                </span>
              </div>
              <img
                className="project-next__thumb"
                src={nextProject.thumb}
                alt=""
              />
            </Link>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  )
}
