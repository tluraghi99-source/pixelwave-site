import { useState } from "react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { SERVICES } from "@/data/services"

// Temporary stand-in photography (Lorem Picsum) until real service imagery is
// ready — same posture as Work.tsx's GALLERY_ITEMS.
const SERVICES_WITH_IMAGES = SERVICES.map((s) => ({
  ...s,
  image: `https://picsum.photos/seed/pixellwave-svc-${s.num}/800/600?grayscale`,
}))

function isHoverCapable() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
}

function ServiceRow({
  service,
  isOpen,
  onMouseEnter,
  onClick,
}: {
  service: (typeof SERVICES_WITH_IMAGES)[number]
  isOpen: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`svc-row${isOpen ? " svc-row--open" : ""}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div className="svc-row__head">
        <span className="svc-row__num">{service.num}</span>
        <span className="svc-row__name">{service.name}</span>
        <span className="svc-row__plus" aria-hidden="true" />
      </div>
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
            {SERVICES_WITH_IMAGES.map((s, i) => (
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
