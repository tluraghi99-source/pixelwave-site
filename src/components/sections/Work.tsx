import { useMemo, useRef, type PointerEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal } from "@/components/motion/Reveal"
import { wrap } from "@/lib/motion"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import { projectThumbUrl, type Project } from "@/lib/strapi"

/** Shared chain (see strapi.ts's projectThumbUrl) — this gallery only ever
 *  shows static images, so a video/youtube heroMediaType (or no cover and
 *  no image heroMedia) falls through to the placeholder, same as every
 *  other project-thumbnail call site. */
function galleryImageUrl(p: Project): string {
  return projectThumbUrl(p, `https://picsum.photos/seed/pixellwave-${p.id}/1200/900?grayscale`)
}

/** How many projects the homepage teases, on both the desktop circular
 *  gallery and the mobile/tablet marquee — the full roster lives on /work. */
const GALLERY_ITEM_COUNT = 7

/** Fisher–Yates shuffle of a copy — never mutates the input array. */
function shuffled<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** A fresh random selection each time the caller's useMemo re-runs (i.e.
 *  once per page load, when `projects` first arrives from Strapi) — falls
 *  back to however many projects exist if there are fewer than `count`. */
function pickRandomProjects(projects: Project[], count: number): Project[] {
  return shuffled(projects).slice(0, count)
}

function WorkMedia({ index }: { index: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 })
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 })

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!ref.current || window.matchMedia("(pointer: coarse)").matches) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * 10)
    rotateX.set(py * -10)
  }

  function handleLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className="flex h-full w-full items-center justify-center"
      style={{
        background: "var(--surface-subtle)",
        color: "var(--pw-neutral-80)",
        rotateX: springX,
        rotateY: springY,
        transformPerspective: 800,
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <span
        style={{ fontFamily: "var(--font-display)" }}
        className="text-6xl font-semibold tracking-tight"
      >
        {index}
      </span>
    </motion.div>
  )
}

function WorkTrack({ projects, x }: { projects: Project[]; x: MotionValue<string> }) {
  // A random selection, reshuffled each time `projects` first arrives (see
  // pickRandomProjects above) — doubled so the marquee track can translate
  // exactly -50% and loop seamlessly.
  const work = useMemo(() => pickRandomProjects(projects, GALLERY_ITEM_COUNT), [projects])
  const cards = [...work, ...work]

  return (
    <motion.div className="work__track" style={{ x }}>
      {cards.map((w, i) => (
        <div className="work__card-wrap" key={`${w.id}-${i}`}>
          <Card
            index={w.idx}
            media={<WorkMedia index={w.idx} />}
            meta={w.tags.map((t, ti) => (
              <Tag key={ti} variant={t.highlighted ? "orange" : "outline"}>
                {t.label}
              </Tag>
            ))}
            title={w.title}
            description={w.desc}
            href={`/work/${w.slug}`}
          >
            <span className="work__view">
              View project <ArrowUpRight size={15} />
            </span>
          </Card>
        </div>
      ))}
    </motion.div>
  )
}

export function WorkGallery({
  projects,
  scrollYProgress,
}: {
  projects: Project[]
  scrollYProgress: MotionValue<number>
}) {
  const galleryRef = useRef<CircularGalleryHandle>(null)
  const navigate = useNavigate()

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  const galleryItems = useMemo(
    () =>
      pickRandomProjects(projects, GALLERY_ITEM_COUNT).map((w) => ({
        image: galleryImageUrl(w),
        text: w.title,
        tags: w.tags.map((t) => ({ variant: t.highlighted ? ("orange" as const) : ("outline" as const), label: t.label })),
        href: `/work/${w.slug}`,
      })),
    [projects]
  )

  // Before the fetch resolves (or if it fails, resolving to []),
  // CircularGallery would otherwise substitute its own built-in stock
  // demo photos — this must stay empty/invisible instead, matching every
  // other surface's "nothing until real data" behavior.
  if (galleryItems.length === 0) return null

  return (
    <CircularGallery
      ref={galleryRef}
      items={galleryItems}
      bend={2}
      borderRadius={0}
      className="work__gallery"
      onItemClick={(href) => navigate(href)}
    />
  )
}

export function WorkHeading(): ReactNode {
  return (
    <div className="work__head">
      <div>
        <Reveal>
          <SectionLabel number="01">Selected Work</SectionLabel>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="lead">Recent waves.</p>
        </Reveal>
      </div>
    </div>
  )
}

/** Mobile/tablet: ambient scroll-linked drift, no pinning (revisit later). */
export function WorkAmbient({ projects }: { projects: Project[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -300])
  const x = useTransform(rawX, (v) => `${wrap(-50, 0, v)}%`)

  return (
    <section
      id="work"
      className="sec work-ambient"
      data-theme="dark"
      data-screen-label="Selected Work"
      ref={sectionRef}
    >
      <div className="wrap">
        <WorkHeading />
      </div>
      <Reveal delay={0.2} className="work__carousel">
        <WorkTrack projects={projects} x={x} />
      </Reveal>
    </section>
  )
}
