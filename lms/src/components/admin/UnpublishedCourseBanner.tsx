import { useAuth } from '@/context/AuthContext'
import { isCoursePublished } from '@/lib/courses'
import type { Course } from '@/types'

type UnpublishedCourseBannerProps = {
  course: Course
}

/** Shown to staff when previewing a course that learners cannot access yet. */
export function UnpublishedCourseBanner({ course }: UnpublishedCourseBannerProps) {
  const { isStaff } = useAuth()
  if (!isStaff || isCoursePublished(course)) return null

  return (
    <div className="relative z-10 mb-4 rounded-xl border border-border/80 bg-surface-2/80 px-4 py-3 text-sm text-fg">
      <p className="font-semibold">Unpublished course</p>
      <p className="mt-1 text-muted">
        Learners cannot see this course on their dashboard or open it by link. Publish it from the
        staff panel when you are ready.
      </p>
    </div>
  )
}
