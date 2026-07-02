import { Marquee } from "@/components/motion/Marquee"

const ITEMS = ["Web Design", "Brand Identity", "Motion", "Development", "Design Systems"]

export function TickerStrip() {
  return (
    <div className="ticker" data-theme="dark" aria-hidden="true">
      <Marquee speed={34}>
        {ITEMS.map((item, i) => (
          <span className="ticker__item" key={item}>
            {item}
            <span className={`ticker__dot ${i % 2 === 0 ? "ticker__dot--orange" : ""}`} />
          </span>
        ))}
      </Marquee>
    </div>
  )
}
