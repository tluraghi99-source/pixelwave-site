import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { Link } from "react-router-dom"
import { ScrambleText } from "@/components/motion/ScrambleText"

type Variant = "primary" | "secondary" | "ghost"
type Size = "sm" | "md" | "lg"

type CommonProps = {
  children: ReactNode
  variant?: Variant
  size?: Size
  pill?: boolean
  block?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  className?: string
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type LinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

export type PwButtonProps = ButtonProps | LinkProps

function cls({
  variant = "primary",
  size = "md",
  pill,
  block,
  className = "",
}: Pick<CommonProps, "variant" | "size" | "pill" | "block" | "className">) {
  return [
    "pw-btn",
    `pw-btn--${variant}`,
    `pw-btn--${size}`,
    pill ? "pw-btn--pill" : "",
    block ? "pw-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
}

export function Button(props: PwButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    pill = false,
    block = false,
    iconLeft,
    iconRight,
    className = "",
    ...rest
  } = props

  const content = (
    <>
      {iconLeft ? <span className="pw-btn__icon">{iconLeft}</span> : null}
      {typeof children === "string" ? <ScrambleText text={children} /> : children}
      {iconRight ? <span className="pw-btn__icon">{iconRight}</span> : null}
    </>
  )

  const classes = cls({ variant, size, pill, block, className })

  if ("href" in rest && rest.href && !("disabled" in rest && rest.disabled)) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    // In-page anchors (and cross-page "/#hash" links) stay plain <a> so the
    // browser's native hash-scroll applies; plain paths get client-side routing.
    if (href.startsWith("/") && !href.includes("#")) {
      return (
        <Link to={href} className={classes} {...anchorRest}>
          {content}
        </Link>
      )
    }
    return (
      <a href={href} className={classes} {...anchorRest}>
        {content}
      </a>
    )
  }

  const { disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button className={classes} disabled={disabled} aria-disabled={disabled} {...buttonRest}>
      {content}
    </button>
  )
}
