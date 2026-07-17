import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { SERVICES } from "@/data/services"

// Scroll runway while pinned: this many vh per row, plus a little tail room
// so the last row gets to fully settle before the section releases.
const PIN_VH_PER_ROW = 60
const PIN_TAIL_VH = 40

function ServiceRow({
  service,
  index,
  total,
  progress,
}: {
  service: (typeof SERVICES)[number]
  index: number
  total: number
  progress: MotionValue<number>
}) {
  // Each row claims a slice of the overall scroll progress, sized evenly by
  // row count; the 0.7 head start lets a row finish revealing a beat before
  // the next one's slice begins, so they don't feel like they're queued up.
  const start = index / total
  const end = (index + 0.7) / total
  // Callback form, not the [start,end]/[from,to] array form — framer-motion's
  // array-range useTransform tries to hardware-accelerate via native
  // ScrollTimeline, and that path breaks down with several sibling elements
  // deriving different ranges off the same shared scroll progress value (each
  // row's reveal would climb correctly, then keep sliding back down for the
  // rest of the scroll instead of holding at its clamped end value). Doing
  // the clamped lerp by hand in a plain function sidesteps that entirely.
  const opacity = useTransform(progress, (v) => Math.min(1, Math.max(0, (v - start) / (end - start))))
  const y = useTransform(progress, (v) => 28 * (1 - Math.min(1, Math.max(0, (v - start) / (end - start)))))

  return (
    <motion.div className="svc__row" style={{ opacity, y }}>
      <div className="svc__swatch" />
      <div className="svc__top">
        <span className="svc__name">{service.name}</span>
        <span className="svc__num">{service.num}</span>
      </div>
      <span className="svc__tags">
        {service.tags.map((t) => (
          <Tag key={t} variant="cyan">
            {t}
          </Tag>
        ))}
      </span>
    </motion.div>
  )
}

/** Desktop: pinned, same shape as WorkReel — scroll scrubs each row's reveal
 *  in sequence, then the section releases once the last one has settled. */
function ServicesPinned() {
  const pinRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] })
  const pinHeight = SERVICES.length * PIN_VH_PER_ROW + PIN_TAIL_VH

  return (
    <section
      ref={pinRef}
      id="services"
      className="svc-pin"
      data-screen-label="Services"
      style={{ height: `${pinHeight}vh` }}
    >
      <div className="svc-pin__inner sec--dark" data-theme="dark">
        <div className="grain-overlay" aria-hidden="true" />
        <div className="wrap">
          <Reveal>
            <SectionLabel number="03">Services</SectionLabel>
          </Reveal>
          <div className="svc mt-12">
            {SERVICES.map((s, i) => (
              <ServiceRow
                key={s.num}
                service={s}
                index={i}
                total={SERVICES.length}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Mobile/tablet: no pin — a pinned scroll-scrub feels janky at that size, so
 *  it stays the plain viewport reveal it always was. */
function ServicesAmbient() {
  return (
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="03">Services</SectionLabel>
        </Reveal>
        <RevealGroup className="svc mt-12" stagger={0.1}>
          {SERVICES.map((s) => (
            <RevealItem key={s.num}>
              <div className="svc__row">
                <div className="svc__swatch" />
                <div className="svc__top">
                  <span className="svc__name">{s.name}</span>
                  <span className="svc__num">{s.num}</span>
                </div>
                <span className="svc__tags">
                  {s.tags.map((t) => (
                    <Tag key={t} variant="cyan">
                      {t}
                    </Tag>
                  ))}
                </span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

export function Services() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")

  return isDesktop ? <ServicesPinned /> : <ServicesAmbient />
}
