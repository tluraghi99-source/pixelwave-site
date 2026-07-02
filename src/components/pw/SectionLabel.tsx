import type { HTMLAttributes, ReactNode } from "react"

interface SectionLabelProps extends HTMLAttributes<HTMLSpanElement> {
  number?: string
  children: ReactNode
  size?: "md" | "lg"
}

export function SectionLabel({
  number,
  children,
  size = "md",
  className = "",
  ...rest
}: SectionLabelProps) {
  const cls = ["pw-seclabel", size === "lg" ? "pw-seclabel--lg" : "", className]
    .filter(Boolean)
    .join(" ")

  return (
    <span className={cls} {...rest}>
      {number != null ? <span className="pw-seclabel__num">{number}</span> : null}
      <span className="pw-seclabel__rule" />
      <span className="pw-seclabel__text">{children}</span>
    </span>
  )
}
