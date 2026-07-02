import type { HTMLAttributes, ReactNode } from "react"

type TagVariant = "outline" | "solid" | "orange" | "cyan" | "outline-accent"

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: TagVariant
  dot?: boolean
  interactive?: boolean
}

export function Tag({
  children,
  variant = "outline",
  dot = false,
  interactive = false,
  className = "",
  ...rest
}: TagProps) {
  const cls = [
    "pw-tag",
    variant !== "outline" ? `pw-tag--${variant}` : "",
    interactive ? "pw-tag--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <span className={cls} {...rest}>
      {dot ? <span className="pw-tag__dot" /> : null}
      {children}
    </span>
  )
}
