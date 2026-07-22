import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  GraduationCap,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { isCoursePublished } from '@/lib/courses'
import {
  apiApprovePendingStaff,
  apiFetchAllProgress,
  apiFetchLearners,
  apiListPendingStaff,
  apiRejectPendingStaff,
  apiAdminSetCoursePublished,
} from '@/lib/supabase/lmsApi'
import { formatPhoneDisplay } from '@/lib/phone'
import { getDisplayName, getFirstName } from '@/utils/userDisplay'
import type { CourseProgress, PendingStaffRequest, User } from '@/types'
import { StatCard } from '@/components/shared/StatCard'
import { resolveCourseThumbnail } from '@/lib/courseImages'
import { CourseThumbnail } from '@/components/shared/CourseThumbnail'
import { CoursePublishBadge, CoursePublishToggle } from '@/components/admin/CoursePublishControls'
import { Card } from '@/components/ui/Card'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Button } from '@/components/ui/Button'

export function AdminOverviewPage() {
  const { user, isAdmin } = useAuth()
  const { courses, refreshCourses } = useCourses()
  const [learners, setLearners] = useState<User[]>([])
  const [allProgress, setAllProgress] = useState<CourseProgress[]>([])
  const [pendingStaff, setPendingStaff] = useState<PendingStaffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [publishError, setPublishError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    const tasks: Promise<unknown>[] = [apiFetchLearners(), apiFetchAllProgress()]
    if (isAdmin) tasks.push(apiListPendingStaff())
    Promise.all(tasks)
      .then((results) => {
        setLearners(results[0] as User[])
        setAllProgress(results[1] as CourseProgress[])
        if (isAdmin && results[2]) setPendingStaff(results[2] as PendingStaffRequest[])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load admin data.'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (staffId: string) => {
    setActionId(staffId)
    try {
      await apiApprovePendingStaff(staffId)
      setPendingStaff((prev) => prev.filter((p) => p.id !== staffId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve request.')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (staffId: string) => {
    setActionId(staffId)
    try {
      await apiRejectPendingStaff(staffId)
      setPendingStaff((prev) => prev.filter((p) => p.id !== staffId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reject request.')
    } finally {
      setActionId(null)
    }
  }

  const handleTogglePublish = async (courseId: string, published: boolean) => {
    setPublishError('')
    setTogglingId(courseId)
    try {
      await apiAdminSetCoursePublished(courseId, published)
      await refreshCourses(true)
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Could not update publish status.')
    } finally {
      setTogglingId(null)
    }
  }

  const totalLessons = courses.reduce((s, c) => s + c.lessons.length, 0)
  const lessonsCompleted = allProgress.reduce((s, p) => s + p.completedLessonIds.length, 0)
  const publishedCount = courses.filter(isCoursePublished).length
  const recentLearners = [...learners]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-8">
      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {publishError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {publishError}
        </Card>
      ) : null}

      <Card padding="lg" className="border-l-4 border-l-accent">
        <p className="text-sm text-muted">Welcome back, {user ? getFirstName(user) : 'Admin'}</p>
        <h2 className="mt-1 text-xl font-bold text-fg sm:text-2xl">Your learning platform at a glance</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Manage courses and learners here. Open <strong className="text-fg">View as learner</strong> on any
          course to see exactly what learners see before you publish changes.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink to="/admin/courses/new" pill fullWidth className="w-full sm:!w-auto">
            <Plus className="h-4 w-4" />
            Add new course
          </ButtonLink>
          <ButtonLink to="/" variant="secondary" pill fullWidth className="w-full sm:!w-auto">
            <GraduationCap className="h-4 w-4" />
            View learner dashboard
          </ButtonLink>
          <ButtonLink to="/admin/learners" variant="outline" pill fullWidth className="w-full sm:!w-auto">
            <Users className="h-4 w-4" />
            All learners
          </ButtonLink>
        </div>
      </Card>

      {isAdmin && pendingStaff.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-fg">Staff access requests</h3>
            <p className="text-sm text-muted">
              These people signed up as admin or instructor and need your approval before they can
              sign in.
            </p>
          </div>
          <div className="space-y-3">
            {pendingStaff.map((request) => (
              <Card key={request.id} padding="md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">
                      {getDisplayName({
                        name: request.name,
                        firstName: request.firstName,
                        lastName: request.lastName,
                      })}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {request.email} · {request.role === 'instructor' ? 'Instructor' : 'Admin'} ·
                      Requested{' '}
                      {new Date(request.requestedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={actionId === request.id}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      loading={actionId === request.id}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Published courses" value={publishedCount} accent="blue" />
        <StatCard icon={BookOpen} label="Total lessons" value={totalLessons} accent="gold" />
        <StatCard icon={Users} label="Registered learners" value={learners.length} accent="green" />
        <StatCard
          icon={GraduationCap}
          label="Lessons completed"
          value={lessonsCompleted}
          sub="Across all learners"
          accent="blue"
        />
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-fg">Courses</h3>
            <p className="text-sm text-muted">See the learner view or edit course content</p>
          </div>
          <ButtonLink to="/admin/courses" variant="ghost" size="sm" className="!w-auto">
            Manage all
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>

        {courses.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-muted">No courses yet.</p>
            <ButtonLink to="/admin/courses/new" pill className="mt-4 inline-flex">
              Create your first course
            </ButtonLink>
          </Card>
        ) : (
          <div className="grid min-w-0 gap-3 sm:gap-4">
            {courses.map((course) => (
              <Card key={course.id} padding="md" className="nf-admin-overview-course">
                <div className="nf-admin-overview-course__layout">
                  <div className="nf-admin-overview-course__content">
                    <div className="nf-admin-overview-course__thumb">
                      <CourseThumbnail
                        src={resolveCourseThumbnail(course)}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="nf-admin-overview-course__info">
                      <div className="nf-admin-overview-course__title-row">
                        <h4 className="nf-admin-overview-course__title">{course.title}</h4>
                        <CoursePublishBadge course={course} className="shrink-0" />
                      </div>
                      <div className="nf-admin-overview-course__meta">
                        <span>{course.category}</span>
                        <span className="nf-admin-overview-course__meta-sep" aria-hidden>
                          &middot;
                        </span>
                        <span>
                          {course.lessons.length} lesson{course.lessons.length === 1 ? '' : 's'}
                        </span>
                        <span className="nf-admin-overview-course__meta-sep" aria-hidden>
                          &middot;
                        </span>
                        <span>{course.level}</span>
                      </div>
                    </div>
                  </div>

                  <div className="nf-admin-overview-course__actions">
                    {isAdmin ? (
                      <CoursePublishToggle
                        course={course}
                        loading={togglingId === course.id}
                        disabled={togglingId !== null}
                        onToggle={(published) => handleTogglePublish(course.id, published)}
                      />
                    ) : null}
                    <ButtonLink
                      to={`/courses/${course.id}`}
                      variant="primary"
                      size="sm"
                      pill
                      fullWidth
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate sm:hidden">View</span>
                      <span className="hidden truncate sm:inline">View as learner</span>
                    </ButtonLink>
                    <ButtonLink
                      to={`/admin/courses/${course.id}`}
                      variant="secondary"
                      size="sm"
                      pill
                      fullWidth
                    >
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-fg">Recent learners</h3>
            <p className="text-sm text-muted">People who signed up with their phone number</p>
          </div>
          <ButtonLink to="/admin/learners" variant="ghost" size="sm" className="!w-auto">
            View all
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>

        {recentLearners.length === 0 ? (
          <Card padding="lg" className="text-center text-sm text-muted">
            Learners will appear here when someone creates an account.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentLearners.map((learner) => (
              <Card key={learner.id} padding="md">
                <p className="font-semibold text-fg">{getDisplayName(learner)}</p>
                <p className="mt-1 text-sm text-muted">
                  {learner.phone ? formatPhoneDisplay(learner.phone) : '—'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Joined {new Date(learner.createdAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
