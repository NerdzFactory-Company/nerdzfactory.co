import { Link, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardList, Image, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/helpers'

const baseTabs = [
  {
    to: '/admin/courses',
    label: 'Courses',
    icon: BookOpen,
    match: (path: string) => path.startsWith('/admin/courses'),
  },
  {
    to: '/admin/assignments',
    label: 'Sheets',
    icon: ClipboardList,
    match: (path: string) => path.startsWith('/admin/assignments'),
  },
  {
    to: '/admin/learners',
    label: 'Learners',
    icon: Users,
    match: (path: string) => path.startsWith('/admin/learners'),
  },
] as const

/** Bottom navigation for staff on phones while in the admin area. */
export function AdminMobileNav() {
  const { pathname } = useLocation()
  const { isAdmin } = useAuth()

  const tabs = isAdmin
    ? [
        { to: '/admin', label: 'Home', icon: BarChart3, match: (p: string) => p === '/admin' },
        ...baseTabs,
        {
          to: '/admin/media',
          label: 'Media',
          icon: Image,
          match: (p: string) => p.startsWith('/admin/media'),
        },
      ]
    : [...baseTabs]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface/95 backdrop-blur-xl lg:hidden"
      aria-label="Admin navigation"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around gap-0.5 px-1 pt-1.5 nf-safe-bottom">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ring-focus sm:text-[11px]',
                active ? 'text-accent' : 'text-muted hover:text-fg',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active && 'text-accent')} aria-hidden />
              <span className="truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
