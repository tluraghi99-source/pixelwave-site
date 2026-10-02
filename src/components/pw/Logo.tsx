import logoWordmark from "@/assets/logo-wordmark.svg"
import logoIconWhite from "@/assets/logo-icon-white.png"

interface BrandLogoProps {
  /** "full" is the icon + wordmark lockup; "icon" is the mark alone. */
  variant?: "full" | "icon"
  /** Fixed pixel height. Omit to size via CSS (e.g. a responsive clamp() on className). */
  height?: number
  /** Flips to the opposite of the asset's natural color — "full" is black by
   *  default (for light backgrounds), "icon" is white by default (for dark). */
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
      src={variant === "icon" ? logoIconWhite : logoWordmark}
      alt="PixelWave"
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
