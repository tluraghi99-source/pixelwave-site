import { useLayoutEffect, useRef, useState } from "react"

interface FitTextProps {
  text: string
  className?: string
  textClassName?: string
  /** Baseline size (px) used to measure natural proportions before fitting. */
  measureFontSize?: number
  "aria-hidden"?: boolean | "true" | "false"
}

/** Scales its text so it always spans exactly the full width of its container — never clipped, never short. */
export function FitText({
  text,
  className,
  textClassName,
  measureFontSize = 200,
  "aria-hidden": ariaHidden,
}: FitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(measureFontSize)

  useLayoutEffect(() => {
    const container = containerRef.current
    const el = textRef.current
    if (!container || !el) return

    function fit() {
      if (!container || !el) return
      el.style.fontSize = `${measureFontSize}px`
      const naturalWidth = el.scrollWidth
      const style = getComputedStyle(container)
      const contentWidth =
        container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      if (naturalWidth > 0 && contentWidth > 0) {
        const fitted = (measureFontSize * contentWidth) / naturalWidth
        // Apply immediately: relying on the React re-render alone can no-op if the
        // computed value happens to match the previous state, leaving the DOM stuck
        // at the imperative measurement size set just above.
        el.style.fontSize = `${fitted}px`
        setFontSize(fitted)
      }
    }

    fit()
    window.addEventListener("resize", fit)
    document.fonts?.ready.then(fit)
    return () => window.removeEventListener("resize", fit)
  }, [text, measureFontSize])

  return (
    <div ref={containerRef} className={className} aria-hidden={ariaHidden}>
      <span
        ref={textRef}
        className={textClassName}
        style={{ fontSize: `${fontSize}px`, display: "inline-block", whiteSpace: "nowrap" }}
      >
        {text}
      </span>
    </div>
  )
}
