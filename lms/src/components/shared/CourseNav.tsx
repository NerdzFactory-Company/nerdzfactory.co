import { Link } from 'react-router-dom'
import { ChevronRight, GraduationCap, PlayCircle, BookOpen } from 'lucide-react'
import { cn } from '@/utils/helpers'

type CourseNavProps = {
  courseId: string
  courseTitle: string
  current: 'overview' | 'learn'
}

export function CourseNav({ courseId, courseTitle, current }: CourseNavProps) {
  const crumbs = [
    { to: '/', label: 'My courses', icon: GraduationCap, active: false },
    {
      to: `/courses/${courseId}`,
      label: courseTitle,
      icon: BookOpen,
      active: current === 'overview',
    },
    ...(current === 'learn'
      ? [{ to: `#`, label: 'Watch lessons', icon: PlayCircle, active: true as const }]
      : []),
  ]

  return (
    <nav aria-label="Course navigation" className="relative z-10 flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const Icon = crumb.icon
        const isLast = i === crumbs.length - 1
        const content = (
          <>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="max-w-[min(42vw,10rem)] truncate sm:max-w-[12rem] md:max-w-[220px]">
              {crumb.label}
            </span>
          </>
        )

        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-muted/50" aria-hidden /> : null}
            {isLast && crumb.active ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold',
                  'bg-accent/15 text-accent',
                )}
                aria-current="page"
              >
                {content}
              </span>
            ) : crumb.to === '#' ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 font-semibold text-accent">
                {content}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-muted transition-colors ring-focus hover:bg-surface-2 hover:text-fg"
              >
                {content}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
