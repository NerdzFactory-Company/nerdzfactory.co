import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leadingIcon?: React.ReactNode
  /** Show eye icon to reveal password (default: on for type="password") */
  passwordToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    hint,
    error,
    leadingIcon,
    passwordToggle,
    id,
    type = 'text',
    ...rest
  },
  ref,
) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const inputId = id ?? rest.name
  const isPassword = type === 'password'
  const showPasswordToggle = passwordToggle ?? isPassword
  const inputType = isPassword && passwordVisible ? 'text' : type

  return (
    <div className="w-full min-w-0">
      {label ? (
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-fg sm:text-base">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted">
            {leadingIcon}
          </div>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'w-full min-w-0 max-w-full rounded-lg border bg-surface text-fg placeholder:text-muted/70',
            'h-12 px-4 text-base sm:h-14 sm:text-lg',
            'transition-colors ring-focus',
            leadingIcon && 'pl-12',
            showPasswordToggle && 'pr-12',
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-accent',
            className,
          )}
          {...rest}
        />
        {showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-fg"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
})
