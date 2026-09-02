import { useMemo, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { ArrowUpRight } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { useProjects } from "@/hooks/useProjects"
import type { Project } from "@/lib/strapi"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

/** Builds the hero/gallery/thumb media fields for one project, falling back
 *  to today's exact Picsum placeholder patterns wherever Strapi's media
 *  fields are empty. Real heroMedia can be an image or a video (decided by
 *  mime type); the placeholder fallback is always a static image. */
function withMedia(p: Project): ProjectWithMedia {
  const hero: MediaItem = p.heroMedia
    ? { type: p.heroMedia.mime.startsWith("video/") ? "video" : "image", src: p.heroMedia.url }
    : { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` }

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

  // Used only as a static <img> "next project" teaser — a video heroMedia
  // still falls back to the Picsum thumb here, same reasoning as the grid
  // thumbnail in WorkPage.tsx.
  const thumb =
    p.heroMedia && !p.heroMedia.mime.startsWith("video/")
      ? p.heroMedia.url
      : `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`

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

function ProjectMedia({ media }: { media: MediaItem }) {
  if (media.type === "video") {
    return <video className="project-video-media" src={media.src} autoPlay loop muted playsInline />
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
        <ProjectMedia media={media} />
        <button type="button" className="project-video-pin__skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — the video/image just renders as a plain full-width
 *  block in normal document flow, same fallback shape every other pinned
 *  desktop section on this site already uses (see WorkReel.tsx). */
function ProjectVideoAmbient({ media }: { media: MediaItem }) {
  return (
    <div className="project-video-ambient" data-screen-label="Project Video">
      <ProjectMedia media={media} />
    </div>
  )
}

function ProjectVideo({ media }: { media: MediaItem }) {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <ProjectVideoPinned media={media} /> : <ProjectVideoAmbient media={media} />
}

function GalleryRow({ items, reverse }: { items: MediaItem[]; reverse: boolean }) {
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
        ) : (
          <img src={item.src} alt="" loading="lazy" />
        )}
      </div>
    ))

  return (
    <div className="project-gallery__row">
      <div className={`project-gallery__track${reverse ? " project-gallery__track--ltr" : ""}`}>
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
              <p className="secbody">{project.desc}</p>
            </Reveal>
          </div>

          <RevealGroup className="project-gallery" stagger={0.1} data-screen-label="Project Gallery">
            <RevealItem>
              <GalleryRow items={project.gallery.slice(0, Math.ceil(project.gallery.length / 2))} reverse={false} />
            </RevealItem>
            {project.gallery.length > 1 && (
              <RevealItem>
                <GalleryRow items={project.gallery.slice(Math.ceil(project.gallery.length / 2))} reverse={true} />
              </RevealItem>
            )}
          </RevealGroup>

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
