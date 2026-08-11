import { useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { PROJECTS } from "@/data/work"

// "Featured" is a highlight badge, not a category, so it's excluded from the filter row.
const FILTER_TAGS = Array.from(
  new Set(PROJECTS.flatMap((p) => p.tags.map(([, label]) => label)))
).filter((label) => label !== "Featured")

// Alphabetical (unlike FILTER_TAGS' insertion order) — categories are a
// small curated set where order doesn't matter; clients are the dimension
// expected to grow, so alphabetical keeps a long list scannable.
const FILTER_CLIENTS = Array.from(new Set(PROJECTS.map((p) => p.client))).sort()

export function WorkPage() {
  const [mode, setMode] = useState<"category" | "client">("category")
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeClient, setActiveClient] = useState<string | null>(null)

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Single-select: picking a client is a lookup ("show me X's work"), not a
  // facet you stack with other clients — clicking the active one clears it.
  function selectClient(client: string) {
    setActiveClient((prev) => (prev === client ? null : client))
  }

  // Each mode keeps its own selection independently — switching tabs never
  // clears the other dimension's picks, only the active mode's selection
  // actually drives the grid below.
  const visibleProjects = useMemo(() => {
    if (mode === "category") {
      if (activeTags.size === 0) return PROJECTS
      return PROJECTS.filter((p) => p.tags.some(([, label]) => activeTags.has(label)))
    }
    if (!activeClient) return PROJECTS
    return PROJECTS.filter((p) => p.client === activeClient)
  }, [mode, activeTags, activeClient])

  return (
    <>
      <main>
        <section className="sec work-page" data-screen-label="All Work">
          <div className="work-hero" data-screen-label="Work Hero">
            <CursorGlow className="cursor-glow" variant="light" glow />
          </div>
          <CursorGlow className="cursor-glow" variant="light" glow={false} />
          <div className="wrap">
            <div className="work-page__head">
              <Reveal delay={0.1}>
                <p className="lead">All projects.</p>
              </Reveal>
              <Reveal delay={0.15} className="work-page__filter-block">
                <div className="work-page__mode-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "category"}
                    className={`work-page__mode-tab ${mode === "category" ? "is-active" : ""}`}
                    onClick={() => setMode("category")}
                  >
                    Category
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "client"}
                    className={`work-page__mode-tab ${mode === "client" ? "is-active" : ""}`}
                    onClick={() => setMode("client")}
                  >
                    Client
                  </button>
                </div>

                {mode === "category" ? (
                  <div className="work-page__filters">
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
                  </div>
                ) : (
                  <div className="work-page__filters">
                    {FILTER_CLIENTS.map((client) => (
                      <button
                        key={client}
                        type="button"
                        className={`work-page__filter ${activeClient === client ? "is-active" : ""}`}
                        aria-pressed={activeClient === client}
                        onClick={() => selectClient(client)}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                )}
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
                    href={`/work/${p.slug}`}
                  >
                    <span className="work__view">
                      View project <ArrowUpRight size={15} />
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
