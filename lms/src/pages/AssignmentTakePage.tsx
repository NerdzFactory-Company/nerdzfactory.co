import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import {
  apiFetchAssignments,
  apiGetMySubmission,
  apiSubmitAssignment,
} from '@/lib/supabase/lmsApi'
import type { Assignment } from '@/types'
import { AssignmentForm } from '@/components/assignments/AssignmentForm'
import { validateAssignmentAnswers } from '@/lib/assignmentForm'
import { SubmissionQaView } from '@/components/assignments/SubmissionQaView'
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/shared/PageSpinner'

export function AssignmentTakePage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const { isStaff, isLearner, user } = useAuth()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<'form' | 'review'>('form')

  useEffect(() => {
    if (!assignmentId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await apiFetchAssignments()
        const found = list.find((a) => a.id === assignmentId)
        if (!found) {
          if (!cancelled) setError('This assignment was not found.')
          return
        }
        if (!cancelled) setAssignment(found)

        if (!isStaff) {
          const existing = await apiGetMySubmission(assignmentId)
          if (existing && !cancelled) {
            setAnswers(existing.answers)
            setSubmittedAt(existing.submittedAt)
            setLocked(Boolean(existing.locked) || Boolean(found.locked))
            setViewMode('review')
          } else if (!cancelled) {
            setLocked(Boolean(found.locked))
          }
        } else if (!cancelled) {
          setLocked(Boolean(found.locked))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load assignment.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assignmentId, isStaff])

  const handleSubmit = async () => {
    if (!assignment || !assignmentId) return
    if (isStaff) {
      setError('Staff accounts cannot submit worksheets. Sign in as a learner.')
      return
    }
    if (locked || assignment.locked) {
      setError('This worksheet is locked by your instructor. You can no longer change your answers.')
      return
    }
    if (!user || !isLearner) {
      setError('Please sign in with your phone number to submit this worksheet.')
      return
    }

    const validationError = validateAssignmentAnswers(assignment, answers)
    if (validationError) {
      setError(validationError)
      setSuccess(false)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await apiSubmitAssignment(assignmentId, answers)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const saved = await apiGetMySubmission(assignmentId)
      setSubmittedAt(saved?.submittedAt ?? new Date().toISOString())
      if (saved?.answers) setAnswers(saved.answers)
      setLocked(Boolean(saved?.locked))
      setSuccess(true)
      setViewMode('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your answers. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSpinner className="py-24" />

  if (!assignment) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-muted">{error ?? 'Assignment not found.'}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/assignments')}>
          Back to assignments
        </Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      {isStaff ? <AdminPreviewBanner /> : null}

      <Link
        to="/assignments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        All assignments
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-fg sm:text-3xl">{assignment.title}</h1>
        {submittedAt ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Submitted {new Date(submittedAt).toLocaleString()}
          </p>
        ) : null}
        {locked || assignment.locked ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Lock className="h-4 w-4" />
            Locked by instructor — answers can no longer be changed
          </p>
        ) : null}
      </div>

      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {success ? (
        <Card padding="md" className="border-success/30 bg-success/5 text-sm text-success">
          Your answers were saved successfully. Your instructor can now review them.
        </Card>
      ) : null}

      {isStaff ? (
        <Card padding="md" className="border-gold/30 bg-gold/10 text-sm text-fg">
          Preview only. Sign in as a learner to submit worksheet answers.
        </Card>
      ) : null}

      {viewMode === 'review' && submittedAt && !isStaff ? (
        <div className="space-y-4">
          <SubmissionQaView
            assignment={assignment}
            submission={{
              id: 'preview',
              assignmentId: assignment.id,
              learnerId: user?.id ?? '',
              answers,
              submittedAt,
              locked,
              learnerName: user?.name,
              learnerFirstName: user?.firstName,
              learnerLastName: user?.lastName,
              learnerPhone: user?.phone,
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            {!locked && !assignment.locked ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setViewMode('form')
                  setSuccess(false)
                  setError(null)
                }}
              >
                Edit answers
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => navigate('/assignments')}>
              Back to assignments
            </Button>
          </div>
        </div>
      ) : (
        <Card padding="lg" className="space-y-6">
          <AssignmentForm
            assignment={assignment}
            answers={answers}
            onChange={(next) => {
              setAnswers(next)
              setError(null)
              setSuccess(false)
            }}
            disabled={saving || isStaff || locked || Boolean(assignment.locked)}
          />
          <div className="flex flex-col gap-2 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate('/assignments')} disabled={saving}>
              {isStaff ? 'Back' : 'Cancel'}
            </Button>
            {!isStaff && !locked && !assignment.locked ? (
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {submittedAt ? 'Update submission' : 'Submit assignment'}
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}
