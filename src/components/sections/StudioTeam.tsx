import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { TEAM } from "@/data/team"

// Temporary stand-in photography (Lorem Picsum) until real team photos are
// ready — same posture as Work.tsx's GALLERY_ITEMS. Two seeds per person so
// the hover-swap has a second, different placeholder image to crossfade to.
const TEAM_WITH_PHOTOS = TEAM.map((m) => ({
  ...m,
  photo: `https://picsum.photos/seed/pixellwave-team-${m.id}/600/750?grayscale`,
  photoHover: `https://picsum.photos/seed/pixellwave-team-${m.id}-alt/600/750?grayscale`,
}))

function TeamCard({ member }: { member: (typeof TEAM_WITH_PHOTOS)[number] }) {
  return (
    <div className="team-card">
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
      </div>
      <div className="team-card__body">
        <span className="team-card__name">{member.name}</span>
        <span className="team-card__role">{member.role}</span>
      </div>
    </div>
  )
}

export function StudioTeam() {
  return (
    <section className="studio-team" data-theme="dark" data-screen-label="Studio Team">
      <div className="wrap">
        <RevealGroup className="team-grid" stagger={0.05} amount={0.05}>
          {TEAM_WITH_PHOTOS.map((m) => (
            <RevealItem key={m.id}>
              <TeamCard member={m} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
