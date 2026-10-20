import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
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

/** One random project image per service, drawn only from the projects assigned
 *  that service's Work Category (service names match the category names).
 *  A service whose category has no project with an image gets null — its row
 *  just shows the text, never a random or stock picture. Reshuffled once per
 *  page load; the scarcest categories choose first so a project that's the
 *  only match for one service isn't taken by a service with more options. */
function pickServiceImages(projects: Project[]): (string | null)[] {
  const withThumb = projects.filter(hasRealThumb)
  const pools = SERVICES.map((service) =>
    shuffle(withThumb.filter((p) => p.workCategories.some((c) => c.toLowerCase() === service.name.toLowerCase())))
  )
  const used = new Set<string>()
  const images: (string | null)[] = SERVICES.map(() => null)
  SERVICES.map((_, i) => i)
    .filter((i) => pools[i].length > 0)
    .sort((a, b) => pools[a].length - pools[b].length)
    .forEach((i) => {
      const pick = pools[i].find((p) => !used.has(p.id)) ?? pools[i][0]
      used.add(pick.id)
      images[i] = projectThumbUrl(pick, "")
    })
  return images
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
  service: (typeof SERVICES)[number] & { image: string | null }
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

  // Service names are the same strings as the Work Categories, so this lands
  // on /work with that category already selected (see WorkPage's ?category=).
  const workHref = `/work?category=${encodeURIComponent(service.name)}`

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
        <Link
          to={workHref}
          className="svc-row__name"
          // Touch devices have no hover, so a tap on the name is how a row
          // opens (the row's own onClick) — navigating there would make the
          // description unreachable. They use the "See projects" link inside
          // the opened row instead.
          onClick={(e) => {
            if (!isHoverCapable()) e.preventDefault()
          }}
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
        </Link>
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
              <Link to={workHref} className="svc-row__link">
                See {service.name} projects <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {service.image && (
              <div className="svc-row__image">
                <img src={service.image} alt={service.name} loading="lazy" />
              </div>
            )}
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
