import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { useProjects } from "@/hooks/useProjects"
import { useWorkCategories } from "@/hooks/useWorkCategories"
import { projectThumbUrl, type Project } from "@/lib/strapi"

/** Shared chain (see strapi.ts's projectThumbUrl) — a small grid card is
 *  never a sensible place to autoplay a video or a YouTube embed,
 *  regardless of what the project's actual hero media is. */
function gridThumbUrl(p: Project): string {
  return projectThumbUrl(p, `https://picsum.photos/seed/pixellwave-${p.id}/900/1200?grayscale`)
}

const FADE_WIDTH = 20 // px

/** The scrollable filter-pill row (.work-page__filters, shared by both
 *  Category and Client mode). The edge fade only used to be a static
 *  mask-image baked into the CSS class, always on — which faded the first
 *  and last pill even when the whole list fit with nothing hidden past
 *  either edge, needlessly clipping legible text. This measures actual
 *  scroll position/overflow instead, so each edge fades only while there's
 *  real content hidden behind it, and clears once you've scrolled all the
 *  way to that edge. */
function FilterRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })

  const measure = () => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    // Bail out when nothing actually changed — this runs on every render
    // (see the dependency-free useLayoutEffect below), and setting a new
    // object unconditionally would re-render every time, which re-runs this
    // effect, which sets state again: an infinite render loop.
    setFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // No dependency array — re-measures after every render, which covers a
  // mode switch or filter-list change (both change this row's content and
  // therefore its scrollWidth) without needing to track those inputs here.
  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // A trackpad's horizontal swipe (real deltaX) already scrolls this
    // natively via overflow-x — nothing to do there. A plain mouse's wheel
    // only ever sends deltaY though, which a horizontal-only overflow
    // container ignores by default, reading as "not scrollable" to anyone
    // without a trackpad. Redirecting a vertically-dominant wheel gesture
    // into scrollLeft (only while this row actually overflows, so a mouse
    // over a fully-visible list still scrolls the page normally) covers it.
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener("scroll", measure, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("resize", measure)
    return () => {
      el.removeEventListener("scroll", measure)
      el.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maskImage =
    fade.left && fade.right
      ? `linear-gradient(to right, transparent, black ${FADE_WIDTH}px, black calc(100% - ${FADE_WIDTH}px), transparent)`
      : fade.left
        ? `linear-gradient(to right, transparent, black ${FADE_WIDTH}px)`
        : fade.right
          ? `linear-gradient(to left, transparent, black ${FADE_WIDTH}px)`
          : "none"

  return (
    <div
      ref={ref}
      className="work-page__filters"
      style={{ maskImage, WebkitMaskImage: maskImage }}
    >
      {children}
    </div>
  )
}

export function WorkPage() {
  const projects = useProjects()
  const workCategories = useWorkCategories()

  // The fixed Video/Photo/Branding/Web Design/Social/Events taxonomy (see
  // useWorkCategories), in its own editorial order — every category always
  // shows here, independent of whether any project currently has it
  // assigned yet. Separate from each project's own display `tags`, which
  // never drove this filter's button list.
  const FILTER_CATEGORIES = useMemo(() => workCategories.map((c) => c.name), [workCategories])

  // Alphabetical (unlike FILTER_CATEGORIES' editorial order) — categories are
  // a small curated set where order doesn't matter; clients are the
  // dimension expected to grow, so alphabetical keeps a long list scannable.
  const FILTER_CLIENTS = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client))).sort(),
    [projects]
  )

  // Lets the nav menu's "Category"/"Client" links land directly on a mode
  // (e.g. /work?mode=client) — read once on mount, not kept in sync with
  // further clicks on the toggle below (out of scope for now).
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<"category" | "client">(
    searchParams.get("mode") === "client" ? "client" : "category"
  )
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [activeClient, setActiveClient] = useState<string | null>(null)

  function toggleCategory(category: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
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
      if (activeCategories.size === 0) return projects
      return projects.filter((p) => p.workCategories.some((c) => activeCategories.has(c)))
    }
    if (!activeClient) return projects
    return projects.filter((p) => p.client === activeClient)
  }, [projects, mode, activeCategories, activeClient])

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
                    {mode === "category" && (
                      <motion.span
                        className="work-page__mode-tab-underline"
                        layoutId="work-page__mode-tab-underline"
                        transition={{ duration: 0.3, ease: EASE_WAVE }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "client"}
                    className={`work-page__mode-tab ${mode === "client" ? "is-active" : ""}`}
                    onClick={() => setMode("client")}
                  >
                    Client
                    {mode === "client" && (
                      <motion.span
                        className="work-page__mode-tab-underline"
                        layoutId="work-page__mode-tab-underline"
                        transition={{ duration: 0.3, ease: EASE_WAVE }}
                      />
                    )}
                  </button>
                </div>

                {mode === "category" ? (
                  <FilterRow>
                    {FILTER_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`work-page__filter ${activeCategories.has(category) ? "is-active" : ""}`}
                        aria-pressed={activeCategories.has(category)}
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </FilterRow>
                ) : (
                  <FilterRow>
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
                  </FilterRow>
                )}
              </Reveal>
            </div>

            {/* amount is fraction of the GROUP's own height, not the viewport's —
                default 0.2 is unreachable for a grid this much taller than the
                viewport, so it would never reveal. */}
            {/* key forces a remount on filter change — whileInView's viewport.once
                only fires once per mount, so without this, cards that mount later
                (e.g. widening back out after narrowing) would stay at opacity 0. */}
            {visibleProjects.length > 0 && (
              <RevealGroup
                key={
                  mode === "category" ? `cat:${[...activeCategories].sort().join(",")}` : `cli:${activeClient ?? ""}`
                }
                className="work-grid"
                stagger={0.06}
                amount={0.01}
              >
                {visibleProjects.map((p) => (
                  <RevealItem key={p.id}>
                    <Card
                      index={p.idx}
                      titleFirst
                      media={<img src={gridThumbUrl(p)} alt={p.title} />}
                      meta={p.tags.map((t, ti) => (
                        <Tag key={ti} variant={t.highlighted ? "orange" : "outline"}>
                          {t.label}
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
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
