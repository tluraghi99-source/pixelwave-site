/** Fisher–Yates shuffle of a copy — never mutates the input. Shared by
 *  every "show these in a different order each time" listing (team grid,
 *  work carousel/gallery, work grid). */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
