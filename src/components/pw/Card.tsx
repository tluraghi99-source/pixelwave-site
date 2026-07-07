import type { HTMLAttributes, ReactNode } from "react"

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  media?: ReactNode
  index?: string
  title?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  href?: string
  interactive?: boolean
  children?: ReactNode
}

export function Card({
  media,
  index,
  title,
  description,
  meta,
  href,
  interactive = true,
  children,
  className = "",
  ...rest
}: CardProps) {
  const cls = ["pw-card", interactive ? "pw-card--interactive" : "", className]
    .filter(Boolean)
    .join(" ")

  const body = (
    <>
      {media ? (
        <div className="pw-card__media">
          {media}
          <div className="pw-card__overlay">
            <div className="pw-card__overlay-content">
              {description ? <p className="pw-card__desc">{description}</p> : null}
              {children}
            </div>
          </div>
        </div>
      ) : null}
      <div className="pw-card__body">
        {index ? <span className="pw-card__index">{index}</span> : null}
        {meta ? <div className="pw-card__meta">{meta}</div> : null}
        {title ? <h3 className="pw-card__title">{title}</h3> : null}
      </div>
    </>
  )

  if (href) {
    return (
      <a className={cls} href={href} {...rest}>
        {body}
      </a>
    )
  }

  return (
    <div className={cls} {...rest}>
      {body}
    </div>
  )
}
