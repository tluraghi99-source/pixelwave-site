import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Counter } from "@/components/motion/Counter"

const STATS = [
  { value: 40, suffix: "+", label: "Projects shipped" },
  { value: 98, suffix: "%", label: "Client satisfaction" },
  { value: 4, suffix: "", label: "Disciplines, one studio" },
]

export function Studio() {
  return (
    <section id="studio" className="sec sec--tint" data-screen-label="Studio">
      <div className="wrap studio__grid">
        <div>
          <Reveal>
            <SectionLabel number="02">Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="studio__statement">
              We're a small team that treats every pixel like it matters — pairing{" "}
              <span className="accent-orange">precise craft</span> with{" "}
              <span className="accent-cyan">fluid momentum</span> to ship work that feels
              considered, not templated.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="studio__stats">
          {STATS.map((s) => (
            <RevealItem className="stat" key={s.label}>
              <span className="stat__num">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
              <span className="stat__label">{s.label}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
