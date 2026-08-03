import logoShort from "@/assets/logo-short-white.png"
import { Marquee } from "@/components/motion/Marquee"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { CLIENTS } from "@/data/clients"

// Every row repeats the full roster rather than splitting it in half —
// denser than one logo per client, but all items are the same placeholder
// image anyway, so there's nothing lost by showing each row twice as many.
const ROW_ONE = CLIENTS
const ROW_TWO = CLIENTS

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
