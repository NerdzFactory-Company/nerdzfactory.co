import { useEffect, useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import { apiFetchAllProgress, apiFetchLearners } from '@/lib/supabase/lmsApi'
import { formatPhoneDisplay } from '@/lib/phone'
import { publishedCourses } from '@/lib/courses'
import { summarizeLearnerProgress } from '@/lib/learnerProgress'
import { getDisplayName } from '@/utils/userDisplay'
import { useCourses } from '@/context/CoursesContext'
import type { CourseProgress, User } from '@/types'
import { LearnerProgressDetail } from '@/components/admin/LearnerProgressDetail'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function AdminLearnersPage() {
  const { courses } = useCourses()
  // Learners can only take published courses, so progress denominators must match.
  const visibleCourses = publishedCourses(courses)
  const [learners, setLearners] = useState<User[]>([])
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLearner, setSelectedLearner] = useState<User | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([apiFetchLearners(), apiFetchAllProgress()])
      .then(([l, p]) => {
        setLearners(l)
        setProgress(p)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load learners.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-muted">
        Tap a participant to see their video-by-video progress across every course.
      </p>

      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {learners.length === 0 ? (
        <Card padding="lg" className="text-center text-muted">
          No learners yet. People will appear here after they create an account with their phone number.
        </Card>
      ) : (
        <div className="space-y-3">
          {learners.map((learner) => {
            const learnerProgress = progress.filter((p) => p.userId === learner.id)
            const summary = summarizeLearnerProgress(visibleCourses, learnerProgress)

            return (
              <button
                key={learner.id}
                type="button"
                className="nf-admin-learner-row w-full text-left ring-focus"
                onClick={() => setSelectedLearner(learner)}
              >
                <Card padding="md" className="nf-admin-learner-row__card transition-colors hover:border-accent/40">
                  <div className="nf-admin-learner-row__layout">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-base font-bold text-fg sm:text-lg">{getDisplayName(learner)}</h3>
                        <Badge tone="brand">Learner</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {learner.phone ? formatPhoneDisplay(learner.phone) : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Joined {new Date(learner.createdAt).toLocaleDateString()}
                        {learner.jobTitle ? ` · ${learner.jobTitle}` : ''}
                      </p>
                      <div className="mt-3 max-w-lg">
                        <div className="mb-1 flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-xs text-muted">
                          <span>
                            {summary.completedLessons}/{summary.totalLessons} videos done
                            {summary.inProgressLessons > 0
                              ? ` · ${summary.inProgressLessons} in progress`
                              : ''}
                          </span>
                          <span className="font-medium">{summary.overallPercent}%</span>
                        </div>
                        <ProgressBar value={summary.overallPercent} size="sm" />
                      </div>
                    </div>
                    <div className="nf-admin-learner-row__action">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">View progress</span>
                        <span className="sm:hidden">Details</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {selectedLearner ? (
        <LearnerProgressDetail
          learner={selectedLearner}
          courses={visibleCourses}
          progress={progress}
          onClose={() => setSelectedLearner(null)}
        />
      ) : null}
    </div>
  )
}
