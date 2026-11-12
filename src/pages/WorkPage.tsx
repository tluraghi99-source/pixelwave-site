import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/pw/Card"
import { Tag } from "@/components/pw/Tag"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Footer } from "@/components/sections/Footer"
import { CornerCta } from "@/components/sections/CornerCta"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { EASE_WAVE } from "@/lib/motion"
import { useProjects } from "@/hooks/useProjects"
import { usePageMeta } from "@/hooks/usePageMeta"
import { projectThumbUrl, type Project } from "@/lib/strapi"
import { projectPath } from "@/lib/routes"
import { categoryKey, categoryLabel, projectCategoryLabels } from "@/lib/categories"
import { SERVICES } from "@/data/services"

/** Shared chain (see strapi.ts's projectThumbUrl) — a small grid card is
 *  never a sensible place to autoplay a video or a YouTube embed,
 *  regardless of what the project's actual hero media is. */
function gridThumbUrl(p: Project): string {
  return projectThumbUrl(p, `https://picsum.photos/seed/pixelwave-${p.id}/900/1200?grayscale`)
}

const FADE_WIDTH = 20 // px
const WIP_TITLE = "Work in Progress"

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
  usePageMeta(
    "Tutti i progetti — PixelWave",
    "Sfoglia tutti i progetti di PixelWave — video, foto, branding, web design, social ed eventi — filtrabili per categoria o cliente."
  )
  const fetchedProjects = useProjects()
  // Newest year first, then older ones. Projects from the same year are
  // ordered alphabetically by title so the order is predictable (the CMS has
  // no finer date than the year).
  const projects = useMemo(
    () => [...fetchedProjects].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "it")),
    [fetchedProjects]
  )
  // Every service, always — in the order the home page lists them — whether or
  // not a project has it yet: one without any opens its own page, titled with
  // it and empty, until the CMS assigns it to a project. (Matched to the CMS's
  // Work Categories by name, see lib/categories.)
  const FILTER_CATEGORIES = useMemo(() => SERVICES.map((s) => s.name), [])

  // Alphabetical (unlike FILTER_CATEGORIES' editorial order) — categories are
  // a small curated set where order doesn't matter; clients are the
  // dimension expected to grow, so alphabetical keeps a long list scannable.
  const FILTER_CLIENTS = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client))).sort(),
    [projects]
  )

  // Lets the nav menu's "Category"/"Client" links land directly on a mode
  // (e.g. /lavori?vista=cliente) — read once on mount, not kept in sync with
  // further clicks on the toggle below (out of scope for now).
  const [searchParams] = useSearchParams()
  // Arriving on the page, the client view is the one open — unless the link asks
  // for the category one (?vista=categoria, or a ?categoria= to land on).
  const [mode, setMode] = useState<"category" | "client">(() => {
    const view = searchParams.get("vista") ?? searchParams.get("mode") ?? ""
    const wantsCategory =
      ["categoria", "category"].includes(view) || !!(searchParams.get("categoria") ?? searchParams.get("category"))
    return wantsCategory ? "category" : "client"
  })
  // One category at a time, like the client picker: choosing one replaces the
  // previous choice, and clicking the active one clears it (all projects).
  // /lavori?categoria=Video opens with that category already selected — the
  // homepage's Services links use it (if several are given, the first wins).
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () =>
      new Set(
        (searchParams.get("categoria") ?? searchParams.get("category") ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 1)
          .map(categoryKey)
      )
  )
  const [activeClient, setActiveClient] = useState<string | null>(null)

  // Going from one view to the other starts it clean: no category and no client
  // stays selected.
  function switchMode(next: "category" | "client") {
    if (next === mode) return
    setActiveCategories(new Set())
    setActiveClient(null)
    setMode(next)
  }

  // The menu's Categoria / Cliente links, used while already on this page.
  const viewParam = searchParams.get("vista") ?? searchParams.get("mode")
  useEffect(() => {
    if (viewParam) switchMode(["categoria", "category"].includes(viewParam) ? "category" : "client")
    // Only when the link's view changes (switchMode reads the current mode).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam])

  // A ?category= link to a category with no projects yet (or an unknown one)
  // is ignored rather than leaving an empty grid with no button to undo it.
  const selectedCategories = useMemo(
    () => new Set([...activeCategories].filter((k) => FILTER_CATEGORIES.some((name) => categoryKey(name) === k))),
    [activeCategories, FILTER_CATEGORIES]
  )

  // The page title names the category (or, in client mode, the client) you are
  // in, in orange; without one it stays "Progetti.".
  const titleCategory =
    mode === "category" && selectedCategories.size === 1
      ? categoryLabel(FILTER_CATEGORIES.find((n) => selectedCategories.has(categoryKey(n))) ?? [...selectedCategories][0])
      : null

  // The Foto filter on: the project pages opened from here show their
  // photo carousel before the video (see ProjectPage.tsx).
  const photosOnly = mode === "category" && selectedCategories.has("photo")

  function toggleCategory(category: string) {
    const key = categoryKey(category)
    setActiveCategories((prev) => (prev.has(key) ? new Set() : new Set([key])))
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
      if (selectedCategories.size === 0) return projects
      return projects.filter((p) => p.workCategories.some((c) => selectedCategories.has(categoryKey(c))))
    }
    if (!activeClient) return projects
    return projects.filter((p) => p.client === activeClient)
  }, [projects, mode, selectedCategories, activeClient])

  // A service nobody has a project for yet: its page is empty, so the whole page
  // wears hazard stripes (work in progress). Not while the projects are loading.
  const isWip = fetchedProjects.length > 0 && visibleProjects.length === 0

  // On such a page the title swaps, now and then, between the category's name
  // and "Work in Progress". Starts on the name; stays still with reduced motion.
  const reduceMotion = useReducedMotion()
  const [wipWord, setWipWord] = useState(false)
  useEffect(() => {
    setWipWord(false)
    if (!isWip || !titleCategory || reduceMotion) return
    let id = 0
    const step = (showWip: boolean) => {
      id = window.setTimeout(() => {
        setWipWord(!showWip)
        step(!showWip)
      }, 2400)
    }
    step(false)
    return () => window.clearTimeout(id)
  }, [isWip, titleCategory, reduceMotion])
  // Client mode: the chosen client's name takes the title's place, the same way.
  const titleClient = mode === "client" ? activeClient : null
  const shownTitle = titleCategory && isWip && wipWord ? WIP_TITLE : (titleCategory ?? titleClient)

  return (
    <>
      <main>
        <section className={`sec work-page${isWip ? " work-page--wip" : ""}`} data-screen-label="All Work">
          <div className="work-hero" data-screen-label="Work Hero" />
          <CursorGlow className="cursor-glow" variant="light" glow />
          <CornerCta />
          <div className="wrap">
            <div className="work-page__head">
              <Reveal delay={0.1}>
                <p className="lead">
                  {shownTitle ? (
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={shownTitle}
                        className="work-page__lead-active"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35, ease: EASE_WAVE }}
                      >
                        {shownTitle}
                      </motion.span>
                    </AnimatePresence>
                  ) : (
                    "Progetti."
                  )}
                </p>
              </Reveal>
              <Reveal delay={0.15} className="work-page__filter-block">
                <div className="work-page__mode-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "client"}
                    className={`work-page__mode-tab ${mode === "client" ? "is-active" : ""}`}
                    onClick={() => switchMode("client")}
                  >
                    Cliente
                    {mode === "client" && (
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
                    aria-selected={mode === "category"}
                    className={`work-page__mode-tab ${mode === "category" ? "is-active" : ""}`}
                    onClick={() => switchMode("category")}
                  >
                    Categoria
                    {mode === "category" && (
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
                        data-label={categoryLabel(category)}
                        className={`work-page__filter ${selectedCategories.has(categoryKey(category)) ? "is-active" : ""}`}
                        aria-pressed={selectedCategories.has(categoryKey(category))}
                        onClick={() => toggleCategory(category)}
                      >
                        {categoryLabel(category)}
                      </button>
                    ))}
                  </FilterRow>
                ) : (
                  <FilterRow>
                    {FILTER_CLIENTS.map((client) => (
                      <button
                        key={client}
                        type="button"
                        data-label={client}
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
                  mode === "category" ? `cat:${[...selectedCategories].sort().join(",")}` : `cli:${activeClient ?? ""}`
                }
                className="work-grid"
                stagger={0.06}
                amount={0.01}
              >
                {visibleProjects.map((p) => (
                  <RevealItem key={p.id}>
                    <Card
                      titleFirst
                      media={<img src={gridThumbUrl(p)} alt={p.title} />}
                      meta={projectCategoryLabels(p.workCategories).map((label) => (
                        <Tag key={label} variant="outline">
                          {label}
                        </Tag>
                      ))}
                      title={p.title}
                      href={projectPath(p.slug)}
                      linkState={photosOnly ? { photosFirst: true } : undefined}
                    >
                      <span className="work__view">
                        Vedi il progetto <ArrowUpRight size={15} />
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
