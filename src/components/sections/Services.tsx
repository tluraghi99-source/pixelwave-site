import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/pw/Button"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { SERVICES } from "@/data/services"
import { ROUTES } from "@/lib/routes"

function isHoverCapable() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
}

function ServiceRow({
  service,
  isOpen,
  onMouseEnter,
  onClick,
}: {
  service: (typeof SERVICES)[number]
  isOpen: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  return (
    <div className={`svc-row${isOpen ? " svc-row--open" : ""}`} onMouseEnter={onMouseEnter} onClick={onClick}>
      <div className="svc-row__head">
        {/* Just a name: this section explains what the studio does, it does not
            lead to a category — the projects are all under "Tutti i progetti". */}
        <span className="svc-row__name">{service.name}</span>
        <span className="svc-row__plus" aria-hidden="true" />
      </div>
      <div className="svc-row__body">
        <div className="svc-row__body-inner">
          <div className="svc-row__content">
            <p className="svc-row__desc">{service.desc}</p>
            <div className="svc-row__tags">
              {service.tagCols.map((col, colI) => (
                <div className="svc-row__tag-col" key={colI}>
                  {col.map((t, tagI) => (
                    <Tag
                      key={t}
                      variant="cyan"
                      style={{
                        transitionDelay: `${0.1 + (colI * col.length + tagI) * 0.05}s`,
                      }}
                    >
                      {t}
                    </Tag>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** What the studio does, in six, on two columns: three lines of two (01 02 / 03
 *  04 / 05 06). A whole line opens at a time — hover either service and both of
 *  that line open together (a tap on touch screens), so the two columns never
 *  end up staggered; all are closed when the pointer is not on them. No links:
 *  the projects are all under "Tutti i progetti". */
export function Services() {
  const [openLine, setOpenLine] = useState<number | null>(null)

  return (
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <Reveal>
          <SectionLabel number="02">Servizi</SectionLabel>
        </Reveal>
        <div
          className="mt-12"
          onMouseLeave={() => {
            if (isHoverCapable()) setOpenLine(null)
          }}
        >
          <RevealGroup className="svc-list" stagger={0.1}>
            {SERVICES.map((s, i) => {
              const line = Math.floor(i / 2)
              return (
                <RevealItem key={s.num}>
                  <ServiceRow
                    service={s}
                    isOpen={openLine === line}
                    onMouseEnter={() => {
                      if (isHoverCapable()) setOpenLine(line)
                    }}
                    onClick={() => {
                      if (!isHoverCapable()) setOpenLine((prev) => (prev === line ? null : line))
                    }}
                  />
                </RevealItem>
              )
            })}
          </RevealGroup>
        </div>
        <Reveal delay={0.1}>
          <div className="svc-cta">
            <Button
              variant="secondary"
              href={ROUTES.work}
              iconRight={<ArrowUpRight size={16} />}
              className="reel__cta-btn"
            >
              Tutti i progetti
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
