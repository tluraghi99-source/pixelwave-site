import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ScrambleText } from "@/components/motion/ScrambleText"

type CommonProps = {
  text: string
  /** Shown next to the text, slides in on hover. @default <ArrowRight /> */
  icon?: ReactNode
  /** Text-scramble/decode hover effect on the label. @default true */
  scramble?: boolean
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

export type InteractiveHoverButtonProps = ButtonProps | LinkProps

export function InteractiveHoverButton(props: InteractiveHoverButtonProps) {
  const { text, icon = <ArrowRight size={16} />, scramble = true, className, ...rest } = props

  // Color/border live in the plain-CSS `.ihb` rule (index.css), not Tailwind's
  // text-foreground/border-foreground utilities — those sit inside Tailwind's
  // CSS layer, which loses to index.css's unlayered `a { color: ... }` rule
  // regardless of specificity, so an anchor-rendered button here would stay
  // stuck on that link color no matter what Tailwind class is applied.
  //
  // Typography matches Button/.pw-btn (Hanken Grotesk, mixed-case) rather
  // than a mono/uppercase treatment of its own — the two components render
  // side by side on the same pages and need to read as one button system.
  const classes = cn(
    "group ihb relative inline-flex w-fit cursor-pointer items-center justify-center border bg-transparent px-6 py-2.5 text-center text-sm font-semibold tracking-tight transition-colors duration-300",
    className
  )

  // The icon is an absolutely-positioned overlay, not a flex sibling of the
  // text — a flex sibling still claims its layout width (plus the gap) even
  // while invisible at rest, which pushes justify-center's centered group
  // off from the button's true visual center. Overlaying it keeps the text
  // perfectly centered at rest regardless of whether the icon is shown.
  // On hover the text nudges left by exactly enough to clear the icon —
  // for a short label like "Menu" the centered text and the right-aligned
  // icon would otherwise land on top of each other.
  const labelClassName = "transition-transform duration-300 group-hover:-translate-x-3"
  const content = (
    <>
      {scramble ? (
        <ScrambleText text={text} className={labelClassName} />
      ) : (
        <span className={labelClassName}>{text}</span>
      )}
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        {icon}
      </span>
    </>
  )

  if ("href" in rest && rest.href && !("disabled" in rest && rest.disabled)) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
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
