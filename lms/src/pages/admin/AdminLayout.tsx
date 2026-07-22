import { Link, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Users, BarChart3, Plus, GraduationCap, ClipboardList, Image } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { cn } from '@/utils/helpers'

export function AdminLayout() {
  const location = useLocation()
  const { isAdmin, isInstructor } = useAuth()

  const tabs = [
    ...(isAdmin
      ? [{ to: '/admin', label: 'Overview', icon: BarChart3, end: true as const }]
      : []),
    { to: '/admin/courses', label: 'Courses', icon: BookOpen, end: false as const },
    { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList, end: false as const },
    { to: '/admin/learners', label: 'Learners', icon: Users, end: false as const },
    ...(isAdmin
      ? [{ to: '/admin/media', label: 'Media', icon: Image, end: false as const }]
      : []),
  ]

  const isOverview = location.pathname === '/admin'
  const isCoursesList = location.pathname === '/admin/courses'
  const isCourseEditor =
    location.pathname === '/admin/courses/new' ||
    (location.pathname.startsWith('/admin/courses/') && location.pathname !== '/admin/courses')
  const staffLabel = isInstructor ? 'Instructor' : 'Admin'

  const activeTab = tabs.find((t) =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to),
  )

  const pageTitle = isOverview
    ? 'Dashboard'
    : isCourseEditor
      ? location.pathname.endsWith('/new')
        ? 'New course'
        : 'Edit course'
      : (activeTab?.label ?? 'Manage')

  const showGlobalActions = !isCourseEditor

  return (
    <div className="nf-admin-page min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="nf-tagline">{staffLabel}</p>
          <h1 className="mt-1 text-xl font-extrabold text-fg sm:text-2xl">{pageTitle}</h1>
          {showGlobalActions ? (
            <p className="mt-1 hidden text-sm text-muted md:block">
              Manage courses and assignments, track learner progress, and preview the learner
              experience.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {location.pathname.endsWith('/new')
                ? 'Set up your course details, homepage, and lessons.'
                : 'Update course details, homepage content, and lesson videos.'}
            </p>
          )}
        </div>
        {showGlobalActions ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row">
            <ButtonLink
              to="/"
              variant="secondary"
              pill
              className="!w-full sm:!w-auto"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="truncate">Preview</span>
            </ButtonLink>
            {isCoursesList || isOverview ? (
              <ButtonLink to="/admin/courses/new" pill className="!w-full sm:!w-auto">
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">New course</span>
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav className="hidden gap-1 overflow-x-auto border-b border-border/60 pb-px scrollbar-thin lg:flex">
        {tabs.map((tab) => {
          const active = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:gap-2 sm:px-4 sm:py-3',
                active
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-fg',
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}
