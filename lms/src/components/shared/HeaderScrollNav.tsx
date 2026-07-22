import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Image,
  LayoutDashboard,
  User,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/helpers'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  match: (path: string) => boolean
}

function ScrollTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ring-focus',
        active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface-2/80 hover:text-fg',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  )
}

/** Compact horizontal nav — visible below lg where the inline header nav is hidden. */
export function HeaderScrollNav() {
  const { pathname } = useLocation()
  const { isStaff, isAdmin } = useAuth()
  const onAdmin = pathname.startsWith('/admin')

  let items: NavItem[]

  if (onAdmin && isStaff) {
    items = [
      { to: '/', label: 'Learner view', icon: GraduationCap, match: () => false },
      ...(isAdmin
        ? [{ to: '/admin', label: 'Overview', icon: BarChart3, match: (p: string) => p === '/admin' }]
        : []),
      {
        to: '/admin/courses',
        label: 'Courses',
        icon: BookOpen,
        match: (p) => p.startsWith('/admin/courses'),
      },
      {
        to: '/admin/assignments',
        label: 'Assignments',
        icon: ClipboardList,
        match: (p) => p.startsWith('/admin/assignments'),
      },
      {
        to: '/admin/learners',
        label: 'Learners',
        icon: Users,
        match: (p) => p.startsWith('/admin/learners'),
      },
      ...(isAdmin
        ? [
            {
              to: '/admin/media',
              label: 'Media',
              icon: Image,
              match: (p: string) => p.startsWith('/admin/media'),
            },
          ]
        : []),
    ]
  } else {
    items = [
      {
        to: '/',
        label: 'Courses',
        icon: GraduationCap,
        match: (p) => p === '/' || p.startsWith('/courses/'),
      },
      {
        to: '/assignments',
        label: 'Worksheets',
        icon: ClipboardList,
        match: (p) => p.startsWith('/assignments'),
      },
      { to: '/profile', label: 'Profile', icon: User, match: (p) => p === '/profile' },
    ]
    if (isStaff) {
      items.push({
        to: '/admin/courses',
        label: 'Staff',
        icon: LayoutDashboard,
        match: (p) => p.startsWith('/admin'),
      })
    }
  }

  return (
    <nav
      className="border-t border-border/40 bg-surface/40 lg:hidden"
      aria-label="Section navigation"
    >
      <div className="nf-container flex gap-1 overflow-x-auto py-2 scrollbar-thin">
        {items.map((item) => (
          <ScrollTab key={item.to + item.label} item={item} active={item.match(pathname)} />
        ))}
      </div>
    </nav>
  )
}
