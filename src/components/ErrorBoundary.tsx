import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  /** Rendered instead of `children` once something below throws. */
  fallback: ReactNode
  /** When this value changes the boundary tries `children` again (e.g. the
   *  route, so one broken page doesn't block the rest of the site). */
  resetKey?: unknown
  children: ReactNode
}

/** Stops a render/effect error from unmounting the whole app (which leaves a
 *  blank page): shows `fallback` for the broken part instead. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
