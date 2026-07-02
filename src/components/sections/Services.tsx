import { ArrowUpRight } from "lucide-react"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"

const SERVICES = [
  { num: "01", name: "Web Design", tags: ["UX/UI", "Design Systems"] },
  { num: "02", name: "Brand Identity", tags: ["Logo", "Guidelines"] },
  { num: "03", name: "Motion", tags: ["Interaction", "Video"] },
  { num: "04", name: "Development", tags: ["Front-end", "Headless"] },
]

export function Services() {
  return (
    <section id="services" className="sec sec--dark" data-theme="dark" data-screen-label="Services">
      <div className="wrap">
        <Reveal>
          <SectionLabel number="03">Services</SectionLabel>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="lead">What we make.</p>
        </Reveal>
        <Reveal delay={0.18}>
          <p className="secbody">
            Four disciplines, one studio. We move between them so the work stays coherent end to
            end.
          </p>
        </Reveal>
        <RevealGroup className="svc mt-12" stagger={0.1}>
          {SERVICES.map((s) => (
            <RevealItem key={s.num}>
              <div className="svc__row">
                <span className="svc__num">{s.num}</span>
                <span className="svc__name">{s.name}</span>
                <span className="svc__tags">
                  {s.tags.map((t) => (
                    <Tag key={t} variant="cyan">
                      {t}
                    </Tag>
                  ))}
                </span>
                <ArrowUpRight className="svc__arrow" size={22} />
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
