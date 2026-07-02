import logoShortWhite from "@/assets/logo-short-white.png"
import logoIconWhite from "@/assets/logo-icon-white.png"

interface BrandLogoProps {
  /** "full" is the icon + wordmark lockup; "icon" is the mark alone. */
  variant?: "full" | "icon"
  /** Fixed pixel height. Omit to size via CSS (e.g. a responsive clamp() on className). */
  height?: number
  /** The source assets are white-on-transparent; invert renders them black. */
  invert?: boolean
  className?: string
}

export function BrandLogo({
  variant = "full",
  height,
  invert = false,
  className,
}: BrandLogoProps) {
  return (
    <img
      src={variant === "icon" ? logoIconWhite : logoShortWhite}
      alt="PixellWave"
      className={className}
      style={{
        display: "block",
        height,
        width: "auto",
        filter: invert ? "invert(1)" : undefined,
      }}
    />
  )
}
