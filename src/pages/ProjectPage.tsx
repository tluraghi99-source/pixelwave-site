import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Footer } from "@/components/sections/Footer"
import { PROJECTS, type Project } from "@/data/work"

interface MediaItem {
  type: "image" | "video"
  src: string
}

interface ProjectWithMedia extends Project {
  hero: MediaItem
  gallery: MediaItem[]
  thumb: string
}

// Temporary stand-in photography (Lorem Picsum) until real project imagery is
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS. Media URLs never live in data/work.ts itself.
const PROJECTS_WITH_MEDIA: ProjectWithMedia[] = PROJECTS.map((p) => ({
  ...p,
  hero: { type: "image", src: `https://picsum.photos/seed/pixellwave-${p.id}-hero/1600/900?grayscale` },
  gallery: Array.from({ length: 8 }, (_, i) => ({
    type: "image" as const,
    src: `https://picsum.photos/seed/pixellwave-${p.id}-g${i}/900/700?grayscale`,
  })),
  thumb: `https://picsum.photos/seed/pixellwave-${p.id}-hero/400/300?grayscale`,
}))

// Northwind demos the video-hero path with the existing studio.mp4 asset —
// every other project stays image-only until real footage exists.
const northwindEntry = PROJECTS_WITH_MEDIA.find((p) => p.slug === "northwind")
if (northwindEntry) northwindEntry.hero = { type: "video", src: "/video/studio.mp4" }

// "Featured" is a highlight badge, not a service — excluded from the credits
// bar's Role column, same exclusion WorkPage.tsx applies to its filter row.
function roleFor(project: ProjectWithMedia): string {
  return project.tags
    .filter(([, label]) => label !== "Featured")
    .map(([, label]) => label)
    .join(", ")
}

function HeroMedia({ media }: { media: MediaItem }) {
  if (media.type === "video") {
    return <video className="project-hero__media" src={media.src} autoPlay loop muted playsInline />
  }
  return <img className="project-hero__media" src={media.src} alt="" />
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

  const { project, nextProject } = useMemo(() => {
    const index = PROJECTS_WITH_MEDIA.findIndex((p) => p.slug === slug)
    if (index === -1) return { project: undefined, nextProject: undefined }
    return {
      project: PROJECTS_WITH_MEDIA[index],
      nextProject: PROJECTS_WITH_MEDIA[(index + 1) % PROJECTS_WITH_MEDIA.length],
    }
  }, [slug])

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
        <div className="project-hero" data-screen-label="Project Hero">
          <HeroMedia media={project.hero} />
        </div>

        <div className="wrap" data-screen-label="Project Info">
          <Reveal>
            <SectionLabel number={project.idx}>{roleFor(project)}</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="project-page__title">{project.title}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="secbody">{project.desc}</p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="project-credits">
              <div className="project-credits__item">
                <span className="project-credits__label">Client</span>
                {project.client}
              </div>
              <div className="project-credits__item">
                <span className="project-credits__label">Year</span>
                {project.year}
              </div>
              <div className="project-credits__item">
                <span className="project-credits__label">Role</span>
                {roleFor(project)}
              </div>
            </div>
          </Reveal>
        </div>

        <RevealGroup className="project-gallery" stagger={0.1} data-screen-label="Project Gallery">
          <RevealItem>
            <GalleryRow items={project.gallery.slice(0, Math.ceil(project.gallery.length / 2))} reverse={false} />
          </RevealItem>
          <RevealItem>
            <GalleryRow items={project.gallery.slice(Math.ceil(project.gallery.length / 2))} reverse={true} />
          </RevealItem>
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
      </main>
      <Footer />
    </>
  )
}
