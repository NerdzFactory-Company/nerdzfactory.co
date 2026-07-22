import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function BackLink({
  to,
  children,
  className,
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'relative z-10 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors ring-focus hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </Link>
  )
}
