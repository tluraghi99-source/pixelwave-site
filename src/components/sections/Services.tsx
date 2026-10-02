import { useMemo, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { SERVICES } from "@/data/services"
import { useProjects } from "@/hooks/useProjects"
import { shuffle } from "@/lib/array"
import { projectThumbUrl, type Project } from "@/lib/strapi"

/** Only projects with a real still image (cover, or an image hero) — the
 *  shared thumb chain would otherwise hand back a stock placeholder. */
function hasRealThumb(p: Project): boolean {
  return !!p.cover || (p.heroMediaType === "image" && !!p.heroMedia)
}

/** One random project image per service, drawn from the projects assigned
 *  that service's Work Category (service names match the category names).
 *  Reshuffled once per page load; prefers images not already used by an
 *  earlier service, and falls back to any project with an image, then to the
 *  old stock placeholder while Strapi is empty/loading. */
function pickServiceImages(projects: Project[]): string[] {
  const withThumb = projects.filter(hasRealThumb)
  const used = new Set<string>()
  return SERVICES.map((service) => {
    const matching = shuffle(withThumb.filter((p) => p.workCategories.some((c) => c.toLowerCase() === service.name.toLowerCase())))
    const pool = matching.length > 0 ? matching : shuffle(withThumb)
    const pick = pool.find((p) => !used.has(p.id)) ?? pool[0]
    if (!pick) return `https://picsum.photos/seed/pixelwave-svc-${service.num}/800/600?grayscale`
    used.add(pick.id)
    return projectThumbUrl(pick, "")
  })
}

function isHoverCapable() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
}

function ServiceRow({
  service,
  isOpen,
  onMouseEnter,
  onClick,
}: {
  service: (typeof SERVICES)[number] & { image: string }
  isOpen: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  // "Explore" trails the cursor, shown only while hovering the name itself
  // (not the whole row) — same look as CursorHint (cursor-hint /
  // cursor-hint__inner--glow), just retriggered per-hover here instead of
  // once on page load. Position is primed continuously from anywhere in the
  // row (onMouseMove below), not just over the name, so the spring is
  // already near the cursor by the time it actually reaches the name and
  // the label appears — without that, it would visibly fly in from this
  // motion value's initial off-screen default on every single hover.
  const [nameHovered, setNameHovered] = useState(false)
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.5 })
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.5 })

  return (
    <div
      className={`svc-row${isOpen ? " svc-row--open" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseMove={(e) => {
        x.set(e.clientX + 18)
        y.set(e.clientY - 12)
      }}
      onClick={onClick}
    >
      <div className="svc-row__head">
        <span
          className="svc-row__name"
          onMouseEnter={(e) => {
            if (!isHoverCapable()) return
            // Jumping x/y alone isn't enough — springX/springY are what's
            // actually rendered, and useSpring's output always eases toward
            // its source however that source changed, jump included. Only
            // jumping the springs themselves snaps the rendered position
            // straight to the entry point with no lag; x/y still need
            // setting too, so the *next* mousemove eases from the right
            // place instead of from whatever they were last left at.
            const targetX = e.clientX + 18
            const targetY = e.clientY - 12
            x.set(targetX)
            y.set(targetY)
            springX.jump(targetX)
            springY.jump(targetY)
            setNameHovered(true)
          }}
          onMouseLeave={() => setNameHovered(false)}
        >
          {service.name}
        </span>
        <span className="svc-row__plus" aria-hidden="true" />
      </div>
      <AnimatePresence>
        {nameHovered && (
          <motion.span
            className="cursor-hint"
            style={{ x: springX, y: springY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-hidden="true"
          >
            <span className="cursor-hint__inner cursor-hint__inner--glow">Explore</span>
          </motion.span>
        )}
      </AnimatePresence>
      <div className="svc-row__body">
        <div className="svc-row__body-inner">
          <div className="svc-row__content">
            <div>
              <p className="svc-row__desc">{service.desc}</p>
              <div className="svc-row__tags">
                {service.tagCols.map((col, colI) => (
                  <div className="svc-row__tag-col" key={colI}>
                    {col.map((t, tagI) => (
                      <Tag
                        key={t}
                        variant="cyan"
                        style={{ transitionDelay: `${0.1 + (colI * col.length + tagI) * 0.05}s` }}
                      >
                        {t}
                      </Tag>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="svc-row__image">
              <img src={service.image} alt={service.name} loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Services() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const projects = useProjects()
  const servicesWithImages = useMemo(() => {
    const images = pickServiceImages(projects)
    return SERVICES.map((s, i) => ({ ...s, image: images[i] }))
  }, [projects])

  return (
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="02">Services</SectionLabel>
        </Reveal>
        <div
          className="svc-list mt-12"
          onMouseLeave={() => {
            if (isHoverCapable()) setOpenIdx(null)
          }}
        >
          <RevealGroup stagger={0.1}>
            {servicesWithImages.map((s, i) => (
              <RevealItem key={s.num}>
                <ServiceRow
                  service={s}
                  isOpen={openIdx === i}
                  onMouseEnter={() => {
                    if (isHoverCapable()) setOpenIdx(i)
                  }}
                  onClick={() => {
                    if (!isHoverCapable()) setOpenIdx((prev) => (prev === i ? null : i))
                  }}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
