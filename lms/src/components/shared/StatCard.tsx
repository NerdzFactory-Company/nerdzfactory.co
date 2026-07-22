import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'blue',
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'gold' | 'green'
  className?: string
}) {
  const accents = {
    blue: {
      icon: 'from-accent/25 to-accent/5 text-accent ring-accent/20',
      glow: 'bg-accent/10',
    },
    gold: {
      icon: 'from-gold/25 to-gold/5 text-gold ring-gold/20',
      glow: 'bg-gold/10',
    },
    green: {
      icon: 'from-success/25 to-success/5 text-success ring-success/20',
      glow: 'bg-success/10',
    },
  }

  const a = accents[accent]

  return (
    <div className={cn('nf-stat-card relative overflow-hidden', className)}>
      <div className={cn('absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl', a.glow)} />
      <div
        className={cn(
          'relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1',
          a.icon,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{value}</p>
      <p className="relative mt-1 text-sm font-semibold text-muted">{label}</p>
      {sub ? <p className="relative mt-1 text-xs text-muted/80">{sub}</p> : null}
    </div>
  )
}
