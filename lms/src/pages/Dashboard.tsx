import { BookOpen, GraduationCap, PartyPopper, Trophy, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { publishedCourses } from '@/lib/courses'
import { useProgress, getResumeLessonId } from '@/context/ProgressContext'
import { CourseCard, CourseCardSkeleton } from '@/components/shared/CourseCard'
import { LearnerHero, LearnerHeroSkeleton } from '@/components/shared/LearnerHero'
import { StatCard } from '@/components/shared/StatCard'
import { Card } from '@/components/ui/Card'
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner'
import { getFirstName } from '@/utils/userDisplay'

export function DashboardPage() {
  const { user, isStaff } = useAuth()
  const { courses, loading: coursesLoading, error: coursesError } = useCourses()
  const visibleCourses = publishedCourses(courses)
  const { getCoursePercent, getProgressForCourse, getOverallPercent, saveError, loading: progressLoading } =
    useProgress()
  const statsLoading = coursesLoading || progressLoading
  const overall = getOverallPercent()

  const completedCourses = visibleCourses.filter((c) => getCoursePercent(c) === 100).length
  const totalLessons = visibleCourses.reduce((s, c) => s + c.lessons.length, 0)
  const completedLessons = visibleCourses.reduce((s, c) => {
    const p = getProgressForCourse(c.id)
    return s + (p?.completedLessonIds.length ?? 0)
  }, 0)

  const continueCourse =
    visibleCourses.find((c) => {
      const pct = getCoursePercent(c)
      return pct > 0 && pct < 100
    }) ?? visibleCourses[0]

  const continueProgress = continueCourse ? getProgressForCourse(continueCourse.id) : undefined
  const continueResumeId = continueCourse
    ? getResumeLessonId(continueCourse, continueProgress)
    : undefined
  const continuePct = continueCourse ? getCoursePercent(continueCourse) : 0
  const continueHref = continueCourse
    ? continuePct > 0
      ? `/courses/${continueCourse.id}/learn${continueResumeId ? `?lesson=${continueResumeId}` : ''}`
      : `/courses/${continueCourse.id}`
    : undefined

  return (
    <div className="min-w-0 space-y-8 sm:space-y-10">
      {isStaff ? <AdminPreviewBanner /> : null}

      {coursesError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          Could not load courses: {coursesError}
        </Card>
      ) : null}

      {saveError ? (
        <Card padding="md" className="border-warning/30 bg-warning/5 text-sm text-warning">
          Progress could not be saved: {saveError}
        </Card>
      ) : null}

      {statsLoading ? (
        <LearnerHeroSkeleton />
      ) : (
        <LearnerHero
          firstName={getFirstName(user!)}
          overall={overall}
          coursesCount={visibleCourses.length}
          completedLessons={completedLessons}
          totalLessons={totalLessons}
          continueCourse={continueCourse}
          continueHref={continueHref}
        />
      )}

      {statsLoading ? (
        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={BookOpen} label="Courses available" value={visibleCourses.length} accent="blue" />
        <StatCard
          icon={GraduationCap}
          label="Lessons completed"
          value={`${completedLessons}/${totalLessons}`}
          sub={
            totalLessons
              ? `${Math.round((completedLessons / totalLessons) * 100)}% of all lessons`
              : undefined
          }
          accent="gold"
        />
        <StatCard
          icon={Trophy}
          label="Courses finished"
          value={completedCourses}
          sub={
            completedCourses === visibleCourses.length && visibleCourses.length > 0 ? 'All done!' : 'Keep going!'
          }
          accent="green"
        />
      </section>
      )}

      {!statsLoading && overall === 100 && visibleCourses.length > 0 ? (
        <Card
          padding="lg"
          className="relative overflow-hidden border-success/25 bg-gradient-to-br from-success/10 via-surface to-surface"
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-success/15 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success/20 text-success ring-1 ring-success/25">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-fg">Congratulations!</h2>
              <p className="mt-1 text-sm text-muted">
                You have completed all available courses. More training will be added soon.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="nf-section-title">Assignments</h2>
            <p className="nf-section-sub">Worksheets to complete and submit</p>
          </div>
          <Link
            to="/assignments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            <ClipboardList className="h-4 w-4" />
            View all assignments
          </Link>
        </div>
        <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">EIF programme worksheets</p>
            <p className="mt-1 text-sm text-muted">
              Answer questions about your trade and submit for your instructor to review.
            </p>
          </div>
          <Link
            to="/assignments"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            Open assignments
          </Link>
        </Card>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="nf-section-title">Your courses</h2>
          <p className="nf-section-sub">Tap a course to start or continue learning</p>
        </div>

        {coursesLoading || progressLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : visibleCourses.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-muted">No courses are available yet.</p>
            <p className="mt-2 text-sm text-muted">Check back soon — new training is on the way.</p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {visibleCourses.map((course, i) => {
              const pct = getCoursePercent(course)
              const courseProgress = getProgressForCourse(course.id)
              const resumeId = getResumeLessonId(course, courseProgress)
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  percent={pct}
                  courseHref={`/courses/${course.id}`}
                  actionHref={
                    pct > 0
                      ? `/courses/${course.id}/learn${resumeId ? `?lesson=${resumeId}` : ''}`
                      : `/courses/${course.id}`
                  }
                  index={i}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
