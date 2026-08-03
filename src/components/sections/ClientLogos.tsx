import { Marquee } from "@/components/motion/Marquee"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CLIENTS } from "@/data/clients"

const MID = Math.ceil(CLIENTS.length / 2)
const ROW_ONE = CLIENTS.slice(0, MID)
const ROW_TWO = CLIENTS.slice(MID)

// Unlike TickerStrip (decorative filler text, aria-hidden), this is real
// content — who the studio has worked with — so it stays in the
// accessibility tree. The sr-only heading gives screen readers context
// before the two marquee rows, whose own content is each duplicated once
// per row for the seamless-loop effect.
export function ClientLogos() {
  return (
    <div className="client-logos" data-theme="dark">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={38} className="client-logos__row">
        {ROW_ONE.map((name) => (
          <span className="client-logos__item" key={name}>
            {name}
          </span>
        ))}
      </Marquee>
      <Marquee speed={44} reverse className="client-logos__row">
        {ROW_TWO.map((name) => (
          <span className="client-logos__item" key={name}>
            {name}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
