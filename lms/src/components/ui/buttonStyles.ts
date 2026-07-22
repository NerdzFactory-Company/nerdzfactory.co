import { cn } from '@/utils/helpers'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold'
export type ButtonSize = 'sm' | 'md' | 'lg'

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'nf-btn-primary disabled:opacity-50',
  secondary:
    'bg-surface text-fg hover:bg-surface-2 border border-border shadow-card disabled:opacity-50',
  ghost: 'text-fg hover:bg-surface-2/90',
  outline:
    'border-2 border-accent/35 bg-surface/50 text-fg hover:border-accent hover:bg-accent/10',
  gold: 'bg-gradient-to-r from-gold to-gold-light text-ink-900 shadow-lg hover:brightness-105',
}

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-lg sm:min-h-10 sm:px-4',
  md: 'min-h-11 px-4 text-sm rounded-xl sm:min-h-12 sm:px-6 sm:text-base',
  lg: 'min-h-12 px-4 text-sm rounded-xl sm:min-h-14 sm:px-6 sm:text-base',
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  pill,
  fullWidth,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  pill?: boolean
  fullWidth?: boolean
  className?: string
}) {
  return cn(
    'inline-flex max-w-full items-center justify-center gap-2 font-semibold leading-snug transition-all duration-200 ring-focus',
    'whitespace-normal text-center',
    'disabled:pointer-events-none disabled:opacity-60',
    fullWidth ? 'w-full' : 'w-full sm:w-auto',
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    pill && 'nf-btn-pill !rounded-pill',
    className,
  )
}
