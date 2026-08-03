import { useRef, type PointerEvent, type ReactNode } from "react"
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal } from "@/components/motion/Reveal"
import { wrap } from "@/lib/motion"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"
import { PROJECTS } from "@/data/work"

// The homepage teases a curated few — the full roster lives on the /work page.
const WORK = PROJECTS.slice(0, 3)

const CARDS = [...WORK, ...WORK]

// Temporary stand-in photography (Lorem Picsum) until real project imagery is ready.
const GALLERY_ITEMS = WORK.map((w) => ({
  image: `https://picsum.photos/seed/pixellwave-${w.id}/1200/900?grayscale`,
  text: w.title,
  tags: w.tags.map(([variant, label]) => ({ variant: variant || ("outline" as const), label })),
}))

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

function WorkTrack({ x }: { x: MotionValue<string> }) {
  return (
    <motion.div className="work__track" style={{ x }}>
      {CARDS.map((w, i) => (
        <div className="work__card-wrap" key={`${w.id}-${i}`}>
          <Card
            index={w.idx}
            media={<WorkMedia index={w.idx} />}
            meta={w.tags.map((t, ti) => (
              <Tag key={ti} variant={t[0] || "outline"}>
                {t[1]}
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

export function WorkGallery({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const galleryRef = useRef<CircularGalleryHandle>(null)

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  return (
    <CircularGallery
      ref={galleryRef}
      items={GALLERY_ITEMS}
      bend={2}
      borderRadius={0}
      className="work__gallery"
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
export function WorkAmbient() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -300])
  const x = useTransform(rawX, (v) => `${wrap(-50, 0, v)}%`)

  return (
    <section id="work" className="sec" data-screen-label="Selected Work" ref={sectionRef}>
      <div className="wrap">
        <WorkHeading />
      </div>
      <Reveal delay={0.2} className="work__carousel">
        <WorkTrack x={x} />
      </Reveal>
    </section>
  )
}
