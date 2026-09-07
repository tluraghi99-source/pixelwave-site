import { useRef } from "react"
import { useMotionValueEvent, useScroll } from "framer-motion"
import { useScreenSize } from "@/components/hooks/use-screen-size"
import { SectionLabel } from "@/components/pw/SectionLabel"
import { Reveal } from "@/components/motion/Reveal"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CircularGallery, type CircularGalleryHandle } from "@/components/ui/circular-gallery"

// Temporary stand-in photography (Lorem Picsum) until real studio photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS and StudioTeam's
// TEAM_WITH_PHOTOS. No caption text: these are atmosphere shots, not
// cataloged items — an empty `text` suppresses circular-gallery.tsx's hover
// scrim (see the onHover tweak there).
const STUDIO_PHOTOS = Array.from({ length: 8 }, (_, i) => ({
  image: `https://picsum.photos/seed/pixellwave-studio-${i}/1200/900?grayscale`,
  text: "",
}))

function StudioGalleryHeading() {
  return (
    <>
      <Reveal>
        <SectionLabel number="02">Inside the studio</SectionLabel>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="lead">Where it happens.</p>
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
          className="studio-gallery__canvas"
        />
      </div>
    </section>
  )
}

/** Mobile/tablet: no WebGL, no pinning — a plain horizontal track, once
 *  driven by page-scroll drift (structurally identical to WorkAmbient's
 *  WorkTrack in Work.tsx) with no way to move it yourself. Now a native
 *  scroll container instead (see .studio-gallery__carousel), so a swipe
 *  moves it directly — which is also why the photo list is no longer
 *  duplicated: that doubling existed only to hide the seam of the old
 *  infinite scroll-linked loop, and a real scrollable list needs a real
 *  start and end, not a repeat. */
function StudioGalleryTrack() {
  return (
    <div className="studio-gallery__track">
      {STUDIO_PHOTOS.map((photo, i) => (
        <div className="studio-gallery__item" key={i}>
          <img src={photo.image} alt="" loading="lazy" />
        </div>
      ))}
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
      <Reveal delay={0.2} className="studio-gallery__carousel">
        <StudioGalleryTrack />
      </Reveal>
    </section>
  )
}

export function StudioGallery() {
  const screenSize = useScreenSize()
  const isDesktop = screenSize.greaterThanOrEqual("lg")
  return isDesktop ? <StudioGalleryDesktop /> : <StudioGalleryAmbient />
}
