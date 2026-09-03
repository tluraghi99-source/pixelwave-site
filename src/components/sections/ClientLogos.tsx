import { Marquee } from "@/components/motion/Marquee"
import { useClientLogos } from "@/hooks/useClientLogos"
import type { ClientLogo } from "@/lib/strapi"

function ClientMark({ client }: { client: ClientLogo }) {
  if (client.logo) {
    return (
      <img
        className="client-logos__item client-logos__item--logo"
        src={client.logo.url}
        alt={client.name}
      />
    )
  }
  // No logo uploaded for this client yet — a text logotype stands in,
  // same posture as every item did before real logos were sourced.
  return <span className="client-logos__item client-logos__item--text">{client.name}</span>
}

// Client roster now fetched from Strapi's Client Logo content-type — see
// src/lib/strapi.ts's fetchClientLogos(). Every logo is forced to flat
// black via CSS filter (no per-client color exception; see
// .client-logos__item--logo in index.css) so the wall reads as one
// consistent mark rather than a rainbow of brand colors. A client with no
// uploaded logo falls back to a text logotype. Lives inside Footer now
// (light surface, black text), not as its own dark section — Footer's own
// CursorGlow already covers this area, so no second instance is added
// here.
//
// Unlike TickerStrip (decorative filler text, aria-hidden), this is real
// content — who the studio has worked with — so it stays in the
// accessibility tree. The sr-only heading gives screen readers context
// before the two marquee rows, whose own content is each duplicated once
// per row for the seamless-loop effect. No cross-component cache on the
// fetch (see useClientLogos) — a redundant fetch per page visit is cheap
// for a catalog this size.
export function ClientLogos() {
  const clients = useClientLogos()

  return (
    <div className="client-logos">
      <h2 className="sr-only">Clients</h2>
      <Marquee speed={110} className="client-logos__row">
        {clients.map((client) => (
          <ClientMark client={client} key={client.id} />
        ))}
      </Marquee>
      <Marquee speed={125} reverse className="client-logos__row">
        {clients.map((client) => (
          <ClientMark client={client} key={client.id} />
        ))}
      </Marquee>
    </div>
  )
}
