import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, GraduationCap, User } from 'lucide-react'
import { cn } from '@/utils/helpers'

const tabs = [
  {
    to: '/',
    label: 'Courses',
    icon: GraduationCap,
    match: (path: string) => path === '/' || path.startsWith('/courses/'),
  },
  {
    to: '/assignments',
    label: 'Worksheets',
    icon: ClipboardList,
    match: (path: string) => path.startsWith('/assignments'),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
    match: (path: string) => path === '/profile',
  },
] as const

/** Bottom navigation for learners on phones — desktop uses the header nav. */
export function LearnerMobileNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface/95 backdrop-blur-xl lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around gap-1 px-2 pt-2 nf-safe-bottom">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ring-focus',
                active ? 'text-accent' : 'text-muted hover:text-fg',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5', active && 'text-accent')} aria-hidden />
              <span className="truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
