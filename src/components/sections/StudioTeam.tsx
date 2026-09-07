import { useMemo, useState } from "react"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import type { TeamMember } from "@/lib/strapi"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Button } from "@/components/pw/Button"

/** Falls back to today's exact Picsum placeholder pattern when Strapi's
 *  photo/photoHover are empty — each field checked independently, since an
 *  editor could set one before the other. */
function withPhotos(m: TeamMember) {
  return {
    ...m,
    photo: m.photo?.url ?? `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750`,
    photoHover: m.photoHover?.url ?? `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750`,
  }
}

type TeamMemberWithPhotos = ReturnType<typeof withPhotos>

type GridItem =
  | { kind: "member"; member: TeamMemberWithPhotos }
  | { kind: "blank"; id: string }

/** Fisher–Yates shuffle of a copy — never mutates the input. */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** How many columns the grid's widest layout ever shows (see .team-grid) —
 *  reserving this many real members up front guarantees the first row is
 *  always full of people, never a blank "empty beat" card. */
const FIRST_ROW_SIZE = 4

/** A fixed-but-random layout. Members are shuffled first, then padded to a
 *  multiple of 4 (the desktop column count) with plain blank cards so the
 *  grid never ends on a half-empty row. Only the remainder past the first
 *  row gets blanks shuffled in among it — not tacked on the end, but not
 *  eligible for the front either — so they read as a deliberate
 *  rhythm-break rather than a broken first impression. Called from a
 *  useMemo below keyed on the fetched member list, so it only reshuffles
 *  once (when the fetch resolves), not on every render. */
function buildGrid(members: TeamMember[]): GridItem[] {
  const memberItems: GridItem[] = shuffle(members.map(withPhotos)).map((member) => ({ kind: "member", member }))
  const blankCount = (4 - (memberItems.length % 4)) % 4
  const blanks: GridItem[] = Array.from({ length: blankCount }, (_, i) => ({ kind: "blank", id: `blank-${i}` }))

  const firstRow = memberItems.slice(0, FIRST_ROW_SIZE)
  const rest = shuffle([...memberItems.slice(FIRST_ROW_SIZE), ...blanks])
  return [...firstRow, ...rest]
}

function TeamCard({ member }: { member: TeamMemberWithPhotos }) {
  return (
    <div className="team-card team-card--orange">
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
  const members = useTeamMembers()
  const gridItems = useMemo(() => buildGrid(members), [members])
  // Phone-only (see .team-grid__show-all-wrap, ≤480px): the grid opens on
  // just the first two real member cards plus a third shown dimmed as a
  // "there's more" hint, everything else held back until this flips true.
  // Blanks are excluded from that count entirely — they're already hidden
  // below 767px (see .team-card--blank) and never worth revealing. One-way:
  // there's no collapse back once expanded, so the button just disappears.
  const [expanded, setExpanded] = useState(false)

  let memberIndex = -1

  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <CursorGlow className="cursor-glow" variant="dark" glow={false} />
      <div className="wrap">
        {gridItems.length > 0 && (
          <>
            <RevealGroup
              className={`team-grid${expanded ? " team-grid--expanded" : ""}`}
              stagger={0.05}
              amount={0.05}
            >
              {gridItems.map((item) => {
                if (item.kind === "member") {
                  memberIndex += 1
                  const collapseClass =
                    memberIndex === 2 ? " team-card-wrap--peek" : memberIndex > 2 ? " team-card-wrap--collapsed" : ""
                  return (
                    <RevealItem key={item.member.id} className={collapseClass || undefined}>
                      <TeamCard member={item.member} />
                    </RevealItem>
                  )
                }
                return (
                  <RevealItem key={item.id}>
                    <div className="team-card team-card--blank" aria-hidden="true">
                      <div className="team-card__media" />
                    </div>
                  </RevealItem>
                )
              })}
            </RevealGroup>
            {!expanded && memberIndex > 1 && (
              <div className="team-grid__show-all-wrap">
                <Button type="button" variant="secondary" size="md" onClick={() => setExpanded(true)}>
                  Show all
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
