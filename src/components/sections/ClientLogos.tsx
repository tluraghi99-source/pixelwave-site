import logoShort from "@/assets/logo-short-white.png"
import { Marquee } from "@/components/motion/Marquee"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CLIENTS } from "@/data/clients"

const MID = Math.ceil(CLIENTS.length / 2)
const ROW_ONE = CLIENTS.slice(0, MID)
const ROW_TWO = CLIENTS.slice(MID)

// No real client logo files exist yet — every item shows our own wordmark
// as a repeated placeholder graphic, standing in for a future per-client
// logo image. Each client's real name still travels as alt text, so screen
// readers get real distinct content even though the visuals repeat.
//
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
          <img className="client-logos__item" key={name} src={logoShort} alt={name} />
        ))}
      </Marquee>
      <Marquee speed={44} reverse className="client-logos__row">
        {ROW_TWO.map((name) => (
          <img className="client-logos__item" key={name} src={logoShort} alt={name} />
        ))}
      </Marquee>
    </div>
  )
}
