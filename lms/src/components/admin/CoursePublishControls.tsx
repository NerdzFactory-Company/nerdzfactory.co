import { Eye, EyeOff } from 'lucide-react'
import type { Course } from '@/types'
import { isCoursePublished } from '@/lib/courses'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

type CoursePublishBadgeProps = {
  course: Course
  className?: string
}

export function CoursePublishBadge({ course, className }: CoursePublishBadgeProps) {
  const live = isCoursePublished(course)
  return (
    <Badge tone={live ? 'brand' : 'muted'} className={className}>
      {live ? (
        <>
          <Eye className="h-3 w-3" /> Published
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3" /> Unpublished
        </>
      )}
    </Badge>
  )
}

type CoursePublishToggleProps = {
  course: Course
  loading?: boolean
  disabled?: boolean
  onToggle: (published: boolean) => void | Promise<void>
  size?: 'sm' | 'md'
  className?: string
}

export function CoursePublishToggle({
  course,
  loading = false,
  disabled = false,
  onToggle,
  size = 'sm',
  className,
}: CoursePublishToggleProps) {
  const live = isCoursePublished(course)

  return (
    <Button
      type="button"
      variant={live ? 'ghost' : 'secondary'}
      size={size}
      loading={loading}
      disabled={disabled}
      className={cn(
        live && 'text-muted hover:bg-surface-2',
        !live && 'border-accent/30',
        className,
      )}
      onClick={() => void onToggle(!live)}
    >
      {live ? (
        <>
          <EyeOff className="h-4 w-4 shrink-0" />
          Unpublish
        </>
      ) : (
        <>
          <Eye className="h-4 w-4 shrink-0" />
          Publish
        </>
      )}
    </Button>
  )
}
