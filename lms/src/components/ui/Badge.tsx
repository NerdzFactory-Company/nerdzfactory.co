import { cn } from '@/utils/helpers'

type Tone = 'brand' | 'success' | 'muted' | 'gold'

const tones: Record<Tone, string> = {
  brand: 'bg-accent/15 text-accent ring-1 ring-accent/20',
  success: 'bg-success/15 text-success ring-1 ring-success/20',
  muted: 'bg-surface-2 text-muted ring-1 ring-border',
  gold: 'bg-gold/15 text-gold ring-1 ring-gold/20',
}

export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
