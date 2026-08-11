import { Marquee } from "@/components/motion/Marquee"
import { CLIENTS, type Client } from "@/data/clients"

// Every row repeats the full roster rather than splitting it in half —
// denser than one item per client, but doubling the row still reads fine.
const ROW_ONE = CLIENTS
const ROW_TWO = CLIENTS

function ClientMark({ client }: { client: Client }) {
  if (client.logo) {
    return (
      <img
        className={`client-logos__item client-logos__item--logo${client.keepColor ? " client-logos__item--color" : ""}`}
        src={client.logo}
        alt={client.name}
      />
    )
  }
  // No clean logo file exists for this one yet — a text logotype stands in,
  // same posture as every item did before real logos were sourced.
  return <span className="client-logos__item client-logos__item--text">{client.name}</span>
}

// Real client roster (see data/clients.ts) — most have a real logo file
// sourced from Wikimedia Commons, forced to flat black via CSS filter so the
// wall reads as one consistent mark rather than a rainbow of brand colors
// (a few two-tone marks that would lose all contrast under that filter,
// like Inter's crest, keep their real colors instead). A handful of smaller/
// local clients have no clean asset available and fall back to a text
// logotype. Lives inside Footer now (light surface, black text), not as its
// own dark section — Footer's own CursorGlow already covers this area, so
// no second instance is added here.
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
      <Marquee speed={70} className="client-logos__row">
        {ROW_ONE.map((client, i) => (
          <ClientMark client={client} key={`${client.name}-${i}`} />
        ))}
      </Marquee>
      <Marquee speed={80} reverse className="client-logos__row">
        {ROW_TWO.map((client, i) => (
          <ClientMark client={client} key={`${client.name}-${i}`} />
        ))}
      </Marquee>
    </div>
  )
}
