import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  hoverable?: boolean
  glass?: boolean
}

const paddings: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

export function Card({
  className,
  padding = 'md',
  hoverable = false,
  glass = false,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-surface transition-all duration-300 min-w-0',
        glass ? 'nf-glass-card' : 'shadow-card',
        paddings[padding],
        hoverable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated',
        className,
      )}
      style={glass ? undefined : { boxShadow: 'var(--card-shadow)' }}
      {...rest}
    />
  )
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-bold text-fg', className)} {...rest} />
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-muted', className)} {...rest} />
}
