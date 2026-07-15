import { useEffect, useRef, useState } from "react"

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01#$%"

interface ScrambleTextProps {
  text: string
  className?: string
}

/** Cycles through random mono glyphs on hover before resolving back to the real text. */
export function ScrambleText({ text, className }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  useEffect(() => {
    setDisplay(text)
  }, [text])

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [])

  function handleEnter() {
    if (reducedMotionRef.current) return
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    let iteration = 0
    intervalRef.current = window.setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " "
            if (i < iteration) return text[i]
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          })
          .join("")
      )
      if (iteration >= text.length && intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      iteration += 0.5
    }, 30)
  }

  function handleLeave() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setDisplay(text)
  }

  return (
    <span className={className} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {display}
    </span>
  )
}
