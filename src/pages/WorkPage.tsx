import { useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { ScrambleText } from "@/components/motion/ScrambleText"
import { Footer } from "@/components/sections/Footer"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { PROJECTS } from "@/data/work"

// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")

export function WorkPage() {
  const screenSize = useScreenSize()
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Empty selection shows everything; otherwise OR-match any selected tag.
  const visibleProjects = useMemo(() => {
    if (activeTags.size === 0) return PROJECTS
    return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
  }, [activeTags])

  return (
    <>
      <main>
        <section className="sec work-page" data-screen-label="All Work">
          <div className="work-hero" data-screen-label="Work Hero">
            <PixelTrail
              pixelSize={screenSize.lessThan("md") ? 20 : 32}
              fadeDuration={1500}
              delay={0}
              className="z-0"
              pixelClassName="hero__trail-pixel"
            />
          </div>
          <div className="wrap">
            <div className="work-page__head">
              <Reveal delay={0.1}>
                <p className="lead">All projects.</p>
              </Reveal>
              <Reveal delay={0.15} className="work-page__filters">
                {FILTER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`work-page__filter ${activeTags.has(tag) ? "is-active" : ""}`}
                    aria-pressed={activeTags.has(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </Reveal>
            </div>

            {/* amount is fraction of the GROUP's own height, not the viewport's —
                default 0.2 is unreachable for a grid this much taller than the
                viewport, so it would never reveal. */}
            <RevealGroup className="work-grid" stagger={0.06} amount={0.01}>
              {visibleProjects.map((p) => (
                <RevealItem key={p.id}>
                  <Card
                    index={p.idx}
                    titleFirst
                    media={
                      <img
                        src={`https://picsum.photos/seed/pixellwave-${p.id}/900/1200?grayscale`}
                        alt={p.title}
                      />
                    }
                    meta={p.tags.map((t, ti) => (
                      <Tag key={ti} variant={t[0] || "outline"}>
                        {t[1]}
                      </Tag>
                    ))}
                    title={p.title}
                    href="/work"
                  >
                    <span className="work__view">
                      <ScrambleText text="View project" /> <ArrowUpRight size={15} />
                    </span>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
