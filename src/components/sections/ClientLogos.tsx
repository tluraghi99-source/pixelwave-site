import { Marquee } from "@/components/motion/Marquee"
import { CLIENTS } from "@/data/clients"

// Every row repeats the full roster rather than splitting it in half —
// denser than one name per client, but doubling the row still reads fine
// as text logotypes.
const ROW_ONE = CLIENTS
const ROW_TWO = CLIENTS

// No real client logo files exist yet — every name renders as a text
// logotype (bold wordmark styling) standing in for a future per-client
// logo image. Lives inside Footer now (light surface, black text), not as
// its own dark section — Footer's own CursorGlow already covers this area,
// so no second instance is added here.
//
// Unlike TickerStrip (decorative filler text, aria-hidden), this is real
// content — who the studio has worked with — so it stays in the
// accessibility tree. The sr-only heading gives screen readers context
// before the two marquee rows, whose own content is each duplicated once
// per row for the seamless-loop effect.
export function ClientLogos() {
  return (
    <div className="client-logos">
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={38} className="client-logos__row">
        {ROW_ONE.map((name, i) => (
          <span className="client-logos__item" key={`${name}-${i}`}>
            {name}
          </span>
        ))}
      </Marquee>
      <Marquee speed={44} reverse className="client-logos__row">
        {ROW_TWO.map((name, i) => (
          <span className="client-logos__item" key={`${name}-${i}`}>
            {name}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
