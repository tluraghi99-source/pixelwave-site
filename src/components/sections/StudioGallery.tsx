import { useEffect, useRef } from "react"
import { useMotionValueEvent, useScroll } from "framer-motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"

// Real studio photos (public/images/studio), used as-is for now — some are
// multi-shot collages rather than single clean frames, fine as a stand-in
// until final art direction picks/crops individual shots. No caption text:
// these are atmosphere shots, not cataloged items — an empty `text`
// suppresses circular-gallery.tsx's hover scrim (see the onHover tweak there).
const STUDIO_PHOTOS = Array.from({ length: 7 }, (_, i) => ({
  image: `/images/studio/studio-${String(i + 1).padStart(2, "0")}.webp`,
  text: "",
}))

function StudioGalleryHeading() {
  return (
    <>
      <Reveal>
        <SectionLabel number="02">Dentro lo studio</SectionLabel>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="lead">Dove succede.</p>
      </Reveal>
    </>
  )
}

/** Desktop (lg+): the same WebGL CircularGallery the homepage carousel uses —
 *  drag-to-spin, plus a light scroll-linked nudge as the section scrolls
 *  through the viewport. No pinning: this section has no video/blackout
 *  narrative to choreograph, unlike WorkReel, so it stays in normal flow. */
function StudioGalleryDesktop() {
  const sectionRef = useRef<HTMLElement>(null)
  const galleryRef = useRef<CircularGalleryHandle>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    galleryRef.current?.setProgress(latest)
  })

  return (
    <section
      className="studio-gallery"
      data-theme="dark"
      data-screen-label="Studio Gallery"
      ref={sectionRef}
    >
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <StudioGalleryHeading />
      </div>
      <div className="studio-gallery__wrap">
        <CircularGallery
          ref={galleryRef}
          items={STUDIO_PHOTOS}
          bend={1}
          borderRadius={0}
          // Inverted from CircularGallery's portrait default (933.333x1200)
          // to landscape (studio photos read as horizontal shots, unlike
          // the homepage gallery's vertical project cards), then bumped
          // 30% bigger (x1.3) than that inverted 1200x933.333 base.
          cardWidth={1560}
          cardHeight={1213.333}
          // Purely decorative — no href on any item (see Work.tsx's
          // WorkGallery for the linked usage) — so dimming a card on hover
          // would just be noise with nothing to click through to.
          dimOnHover={false}
          className="studio-gallery__canvas"
        />
      </div>
    </section>
  )
}

/** How many times the photo list is repeated end to end in the mobile
 *  carousel. A native scroll container has a real start and end, so to make
 *  it loop the list is laid out several times and the scroll position is
 *  quietly moved by whole repeats once it settles — the content under the
 *  viewport is identical, so nothing visibly jumps. */
const LOOP_COPIES = 5

/** Mobile/tablet: no WebGL, no pinning — a native horizontal scroll
 *  container (a swipe moves it directly) that loops forever instead of
 *  running out into black after the last photo. */
function StudioGalleryLoopingCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const items = Array.from(scroller.querySelectorAll<HTMLElement>(".studio-gallery__item"))
    const perSet = STUDIO_PHOTOS.length
    if (items.length < perSet * 2) return

    // One repeat's width, measured (not computed) so the gap and padding
    // can change in CSS without this drifting out of sync.
    const setWidth = items[perSet].offsetLeft - items[0].offsetLeft
    if (setWidth <= 0) return

    // Start in the middle repeat, so there is room to move both ways.
    scroller.scrollLeft = setWidth * Math.floor(LOOP_COPIES / 2)

    let touching = false
    let timer: number | undefined

    function recenter() {
      if (touching || !scroller) return
      const low = setWidth * (Math.floor(LOOP_COPIES / 2) - 0.5)
      const high = low + setWidth
      let pos = scroller.scrollLeft
      while (pos < low) pos += setWidth
      while (pos >= high) pos -= setWidth
      if (pos !== scroller.scrollLeft) {
        // Snapping would fight the reposition; same content, so it's invisible.
        scroller.style.scrollSnapType = "none"
        scroller.scrollLeft = pos
        requestAnimationFrame(() => {
          scroller.style.scrollSnapType = ""
        })
      }
    }

    function onScroll() {
      window.clearTimeout(timer)
      timer = window.setTimeout(recenter, 120)
    }
    function onTouchStart() {
      touching = true
    }
    function onTouchEnd() {
      touching = false
      onScroll()
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    scroller.addEventListener("touchstart", onTouchStart, { passive: true })
    scroller.addEventListener("touchend", onTouchEnd, { passive: true })
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true })
    return () => {
      window.clearTimeout(timer)
      scroller.removeEventListener("scroll", onScroll)
      scroller.removeEventListener("touchstart", onTouchStart)
      scroller.removeEventListener("touchend", onTouchEnd)
      scroller.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [])

  return (
    <div className="studio-gallery__carousel" ref={scrollerRef}>
      <div className="studio-gallery__track">
        {Array.from({ length: LOOP_COPIES }, (_, copy) =>
          STUDIO_PHOTOS.map((photo, i) => (
            <div className="studio-gallery__item" key={`${copy}-${i}`} aria-hidden={copy === 0 ? undefined : true}>
              <img src={photo.image} alt="" loading="lazy" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StudioGalleryAmbient() {
  return (
    <section className="studio-gallery studio-gallery--ambient" data-theme="dark" data-screen-label="Studio Gallery">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <StudioGalleryHeading />
      </div>
      <Reveal delay={0.2}>
        <StudioGalleryLoopingCarousel />
      </Reveal>
    </section>
  )
}

export function StudioGallery() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioGalleryDesktop /> : <StudioGalleryAmbient />
}
