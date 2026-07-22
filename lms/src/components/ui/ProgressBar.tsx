import { cn } from '@/utils/helpers'

interface ProgressBarProps {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  glow?: boolean
}

export function ProgressBar({
  value,
  className,
  size = 'md',
  showLabel,
  glow,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const complete = pct === 100

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

  return (
    <div className={cn('w-full', className)}>
      {showLabel ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-fg">{pct}% complete</span>
          {complete ? (
            <span className="font-bold text-success">Done!</span>
          ) : (
            <span className="text-muted">{100 - pct}% to go</span>
          )}
        </div>
      ) : null}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-2/80 ring-1 ring-border/50',
          heights[size],
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            complete
              ? 'bg-gradient-to-r from-success to-emerald-400'
              : 'bg-gradient-to-r from-accent via-brand-400 to-accent',
            glow && !complete && 'nf-progress-glow',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Circular progress ring */
export function ProgressRing({
  value,
  size = 64,
  stroke = 5,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--surface-2))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-fg">
        {pct}%
      </span>
    </div>
  )
}
