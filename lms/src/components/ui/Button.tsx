import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { cn } from '@/utils/helpers'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  pill?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading,
    pill,
    fullWidth,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonClassName({ variant, size, pill, fullWidth, className }))}
      {...rest}
    >
      {loading ? (
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
})
