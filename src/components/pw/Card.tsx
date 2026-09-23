import type { HTMLAttributes, ReactNode } from "react"
import { Link } from "react-router-dom"

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  media?: ReactNode
  title?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  href?: string
  interactive?: boolean
  /** Default order is tags, title (homepage carousel). Set this to put the
   *  title before the tags instead (used on the /work listing). */
  titleFirst?: boolean
  children?: ReactNode
}

export function Card({
  media,
  title,
  description,
  meta,
  href,
  interactive = true,
  titleFirst = false,
  children,
  className = "",
  ...rest
}: CardProps) {
  const cls = ["pw-card", interactive ? "pw-card--interactive" : "", className]
    .filter(Boolean)
    .join(" ")

  const titleEl = title ? <h3 className="pw-card__title">{title}</h3> : null
  const metaEl = meta ? <div className="pw-card__meta">{meta}</div> : null

  const body = (
    <>
      {media ? (
        <div className="pw-card__media">
          {media}
          {description || children ? (
            <div className="pw-card__overlay">
              <div className="pw-card__overlay-content">
                {description ? <p className="pw-card__desc">{description}</p> : null}
                {children}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="pw-card__body">
        {titleFirst ? (
          <>
            {titleEl}
            {metaEl}
          </>
        ) : (
          <>
            {metaEl}
            {titleEl}
          </>
        )}
      </div>
    </>
  )

  if (href) {
    if (href.startsWith("/") && !href.includes("#")) {
      return (
        <Link className={cls} to={href} {...rest}>
          {body}
        </Link>
      )
    }
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
