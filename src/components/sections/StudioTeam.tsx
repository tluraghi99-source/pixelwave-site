import { useMemo, useState } from "react"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import type { TeamMember } from "@/lib/strapi"
import { shuffle } from "@/lib/array"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Button } from "@/components/pw/Button"

/** Falls back to today's exact Picsum placeholder pattern when Strapi's
 *  photo/photoHover are empty — each field checked independently, since an
 *  editor could set one before the other. */
function withPhotos(m: TeamMember) {
  return {
    ...m,
    photo: m.photo?.url ?? `https://picsum.photos/seed/pixelwave-team-${m.id}/600/750`,
    photoHover: m.photoHover?.url ?? `https://picsum.photos/seed/pixelwave-team-${m.id}-alt/600/750`,
  }
}

type TeamMemberWithPhotos = ReturnType<typeof withPhotos>

/** A fixed-but-random layout, reshuffled only once per fetched member list
 *  (called from a useMemo below keyed on it). The grid simply ends after
 *  the last real member — no filler cards padding out a partial row. */
function buildGrid(members: TeamMember[]): TeamMemberWithPhotos[] {
  return shuffle(members.map(withPhotos))
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
  // just the first two member cards plus a third shown dimmed as a
  // "there's more" hint, everything else held back until this flips true.
  // One-way: there's no collapse back once expanded, so the button just
  // disappears.
  const [expanded, setExpanded] = useState(false)

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
              {gridItems.map((member, i) => {
                const collapseClass = i === 2 ? " team-card-wrap--peek" : i > 2 ? " team-card-wrap--collapsed" : ""
                return (
                  <RevealItem key={member.id} className={collapseClass || undefined}>
                    <TeamCard member={member} />
                  </RevealItem>
                )
              })}
            </RevealGroup>
            {!expanded && gridItems.length > 2 && (
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
