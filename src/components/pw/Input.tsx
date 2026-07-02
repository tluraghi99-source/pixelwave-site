import type { InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, id, className = "", ...rest }: InputProps) {
  const fieldId = id || (label ? `pw-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined)
  const inputCls = ["pw-input", error ? "pw-input--invalid" : "", className]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="pw-field">
      {label ? (
        <label className="pw-field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <input id={fieldId} className={inputCls} aria-invalid={!!error} {...rest} />
      {error ? (
        <span className="pw-field__hint pw-field__hint--error">{error}</span>
      ) : hint ? (
        <span className="pw-field__hint">{hint}</span>
      ) : null}
    </div>
  )
}
