import { useEffect } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  PlayCircle,
  X,
} from 'lucide-react'
import { formatPhoneDisplay } from '@/lib/phone'
import {
  summarizeLearnerProgress,
  type LessonProgressStatus,
} from '@/lib/learnerProgress'
import { isCoursePublished } from '@/lib/courses'
import { getDisplayName } from '@/utils/userDisplay'
import type { Course, CourseProgress, User } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/shared/StatCard'
import { cn } from '@/utils/helpers'

const STATUS_LABEL: Record<LessonProgressStatus, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  not_started: 'Not started',
}

const STATUS_TONE: Record<LessonProgressStatus, 'success' | 'gold' | 'muted'> = {
  completed: 'success',
  in_progress: 'gold',
  not_started: 'muted',
}

function LessonStatusIcon({ status }: { status: LessonProgressStatus }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
  }
  if (status === 'in_progress') {
    return <PlayCircle className="h-4 w-4 shrink-0 text-gold" aria-hidden />
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted/50" aria-hidden />
}

type LearnerProgressDetailProps = {
  learner: User
  courses: Course[]
  progress: CourseProgress[]
  onClose: () => void
}

export function LearnerProgressDetail({
  learner,
  courses,
  progress,
  onClose,
}: LearnerProgressDetailProps) {
  const learnerProgress = progress.filter((p) => p.userId === learner.id)
  const summary = summarizeLearnerProgress(courses, learnerProgress)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="nf-admin-learner-detail__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="learner-progress-title"
      onClick={onClose}
    >
      <Card
        padding="none"
        className="nf-admin-learner-detail__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="nf-admin-learner-detail__header">
          <div className="min-w-0 flex-1">
            <h2 id="learner-progress-title" className="text-lg font-bold text-fg sm:text-xl">
              {getDisplayName(learner)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {learner.phone ? formatPhoneDisplay(learner.phone) : 'No phone on file'}
              {' · '}
              Joined {new Date(learner.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted ring-focus hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="nf-admin-learner-detail__body">
          {(learner.jobTitle || learner.location || learner.email || learner.bio) && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {learner.email ? (
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Email</p>
                  <p className="mt-1 break-all text-sm text-fg">{learner.email}</p>
                </div>
              ) : null}
              {learner.jobTitle ? (
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Job title</p>
                  <p className="mt-1 text-sm text-fg">{learner.jobTitle}</p>
                </div>
              ) : null}
              {learner.location ? (
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Location</p>
                  <p className="mt-1 text-sm text-fg">{learner.location}</p>
                </div>
              ) : null}
              {learner.bio ? (
                <div className="min-w-0 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">About</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">{learner.bio}</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={BookOpen}
              label="Videos completed"
              value={`${summary.completedLessons}/${summary.totalLessons}`}
              sub={`${summary.overallPercent}% overall`}
              accent="blue"
            />
            <StatCard
              icon={PlayCircle}
              label="In progress"
              value={summary.inProgressLessons}
              sub="Opened, not yet marked done"
              accent="gold"
            />
            <StatCard
              icon={CheckCircle2}
              label="Courses finished"
              value={summary.coursesCompleted}
              sub={`${summary.coursesStarted} started`}
              accent="green"
            />
            <StatCard
              icon={Clock}
              label="Courses available"
              value={courses.length}
              accent="blue"
            />
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-base font-bold text-fg">Progress by course</h3>
            {summary.courses.length === 0 ? (
              <p className="text-sm text-muted">No courses available yet.</p>
            ) : (
              summary.courses.map((courseView) => {
                const { course: c } = courseView
                const published = isCoursePublished(c)

                return (
                  <details
                    key={c.id}
                    className="nf-admin-learner-detail__course group"
                    open={courseView.completedCount > 0 || courseView.inProgressCount > 0}
                  >
                    <summary className="nf-admin-learner-detail__course-summary">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-fg">{c.title}</span>
                          {!published ? (
                            <Badge tone="muted" className="shrink-0">
                              Unpublished
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {courseView.completedCount}/{courseView.totalLessons} videos · {courseView.percent}%
                          {courseView.lastLessonTitle
                            ? ` · Last watched: ${courseView.lastLessonTitle}`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-accent group-open:hidden">
                        Show videos
                      </span>
                      <span className="hidden shrink-0 text-xs font-medium text-muted group-open:inline">
                        Hide
                      </span>
                    </summary>

                    <div className="nf-admin-learner-detail__course-body">
                      <ProgressBar value={courseView.percent} size="sm" className="mb-3" />
                      {courseView.lastActiveAt ? (
                        <p className="mb-3 text-xs text-muted">
                          Last activity{' '}
                          {new Date(courseView.lastActiveAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      ) : null}

                      {courseView.lessons.length === 0 ? (
                        <p className="text-sm text-muted">This course has no videos yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {courseView.lessons.map(({ lesson, order, status }) => (
                            <li
                              key={lesson.id}
                              className={cn(
                                'nf-admin-learner-detail__lesson',
                                status === 'completed' && 'nf-admin-learner-detail__lesson--done',
                                status === 'in_progress' && 'nf-admin-learner-detail__lesson--active',
                              )}
                            >
                              <LessonStatusIcon status={status} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-fg">
                                  <span className="mr-2 text-xs font-bold text-muted">#{order}</span>
                                  {lesson.title || 'Untitled video'}
                                </p>
                                {lesson.duration ? (
                                  <p className="mt-0.5 text-xs text-muted">{lesson.duration}</p>
                                ) : null}
                              </div>
                              <Badge tone={STATUS_TONE[status]} className="shrink-0 text-[10px]">
                                {STATUS_LABEL[status]}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                )
              })
            )}
          </div>
        </div>

        <div className="nf-admin-learner-detail__footer">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:!w-auto">
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
