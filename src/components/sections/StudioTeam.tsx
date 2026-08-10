import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { TEAM } from "@/data/team"
import { CursorGlow } from "@/components/motion/CursorGlow"

// Temporary stand-in photography (Lorem Picsum) until real team photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS. Two seeds per person so
// the hover-swap has a second, different placeholder image to crossfade to.
// No longer forced to grayscale: each card gets a color tint instead (see
// CARD_COLORS below), so the photo itself should carry its own color too.
const TEAM_WITH_PHOTOS = TEAM.map((m) => ({
  ...m,
  photo: `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750`,
  photoHover: `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750`,
}))

// Every card sits on a flat color block, cycling through this sequence —
// mostly the brand orange, with a dark neutral and a rare white beat for
// variety, echoing the reference's per-person color-block team grid without
// spending the site's whole palette on it (still just orange/black/white).
const CARD_COLORS = ["orange", "neutral", "orange", "orange", "neutral", "white"] as const
type CardColor = (typeof CARD_COLORS)[number]

type GridItem =
  | { kind: "member"; member: (typeof TEAM_WITH_PHOTOS)[number]; color: CardColor }
  | { kind: "blank"; id: string }

// Padded to a multiple of 4 (the desktop column count) with plain blank
// cards so the grid never ends on a half-empty row, then those blanks are
// shuffled in among the real cards — not just tacked on the end — so they
// read as a deliberate rhythm-break, the way the reference's own grid
// leaves occasional cells empty, rather than a leftover gap.
const BLANK_COUNT = (4 - (TEAM_WITH_PHOTOS.length % 4)) % 4

/** Fisher–Yates, run once at module load — a fixed-but-random layout, not
 *  reshuffled on every render (which would make cards jump around). */
function buildGrid(): GridItem[] {
  const items: GridItem[] = TEAM_WITH_PHOTOS.map((m, i) => ({
    kind: "member",
    member: m,
    color: CARD_COLORS[i % CARD_COLORS.length],
  }))
  for (let i = 0; i < BLANK_COUNT; i++) items.push({ kind: "blank", id: `blank-${i}` })
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

const GRID_ITEMS = buildGrid()

function TeamCard({ member, color }: { member: (typeof TEAM_WITH_PHOTOS)[number]; color: CardColor }) {
  return (
    <div className={`team-card team-card--${color}`}>
      <div className="team-card__media">
        <img
          className="team-card__photo team-card__photo--base"
          src={member.photo}
          alt={member.name}
          loading="lazy"
        />
        <img
          className="team-card__photo team-card__photo--hover"
          src={member.photoHover}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <div className="team-card__tint" aria-hidden="true" />
        <div className="team-card__scrim" aria-hidden="true" />
        <div className="team-card__caption">
          <span className="team-card__name">{member.name}</span>
          <span className="team-card__role">{member.role}</span>
        </div>
      </div>
    </div>
  )
}

export function StudioTeam() {
  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        <RevealGroup className="team-grid" stagger={0.05} amount={0.05}>
          {GRID_ITEMS.map((item) =>
            item.kind === "member" ? (
              <RevealItem key={item.member.id}>
                <TeamCard member={item.member} color={item.color} />
              </RevealItem>
            ) : (
              <RevealItem key={item.id}>
                <div className="team-card team-card--blank" aria-hidden="true">
                  <div className="team-card__media" />
                </div>
              </RevealItem>
            )
          )}
        </RevealGroup>
      </div>
    </section>
  )
}
