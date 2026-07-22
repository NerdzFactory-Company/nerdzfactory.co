import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Lock, Unlock } from 'lucide-react'
import {
  apiStaffListAssignments,
  apiStaffListSubmissions,
  apiStaffSetAssignmentLocked,
  apiStaffSetSubmissionLocked,
} from '@/lib/supabase/lmsApi'
import { exportSubmissionPdf } from '@/lib/exportSubmissionPdf'
import { formatPhoneDisplay } from '@/lib/phone'
import { getDisplayName } from '@/utils/userDisplay'
import type { Assignment, AssignmentSubmission } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/shared/PageSpinner'

export function AdminAssignmentSubmissionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockingId, setLockingId] = useState<string | null>(null)
  const [lockingAssignment, setLockingAssignment] = useState(false)
  const showingSamples = submissions.some((s) => s.id.startsWith('mock-'))

  const handleExport = (submission: AssignmentSubmission) => {
    if (!assignment) return
    setExportError(null)
    try {
      exportSubmissionPdf(assignment, submission)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export this submission as a PDF.')
    }
  }

  const handleToggleAssignmentLock = async () => {
    if (!assignment) return
    setLockError(null)
    setLockingAssignment(true)
    try {
      const updated = await apiStaffSetAssignmentLocked(assignment.id, !assignment.locked)
      setAssignment((prev) => (prev ? { ...prev, ...updated } : updated))
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Could not update worksheet lock.')
    } finally {
      setLockingAssignment(false)
    }
  }

  const handleToggleLock = async (submission: AssignmentSubmission) => {
    if (submission.id.startsWith('mock-')) {
      setLockError('Sample submissions cannot be locked. Wait for real learner answers.')
      return
    }
    setLockError(null)
    setLockingId(submission.id)
    try {
      const updated = await apiStaffSetSubmissionLocked(submission.id, !submission.locked)
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Could not update lock status.')
    } finally {
      setLockingId(null)
    }
  }

  useEffect(() => {
    if (!assignmentId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await apiStaffListAssignments()
        const found = list.find((a) => a.id === assignmentId)
        if (!found) {
          if (!cancelled) setError('Assignment not found.')
          return
        }
        const subs = await apiStaffListSubmissions(assignmentId)
        if (!cancelled) {
          setAssignment(found)
          setSubmissions(subs)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load submissions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assignmentId])

  if (loading) return <PageSpinner className="py-16" />

  if (!assignment) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-muted">{error ?? 'Assignment not found.'}</p>
        <ButtonLink to="/admin/assignments" variant="secondary" className="mt-4">
          Back to assignments
        </ButtonLink>
      </Card>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <Link
        to="/admin/assignments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        All assignments
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-fg">{assignment.title}</h2>
            {assignment.locked ? (
              <Badge tone="muted">
                <Lock className="h-3 w-3" />
                Worksheet locked
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {submissions.length} submission{submissions.length === 1 ? '' : 's'}
            {assignment.locked
              ? ' · Learners cannot submit or update answers while this worksheet is locked.'
              : ' · Lock the worksheet to stop new or updated answers.'}
          </p>
        </div>
        <Button
          variant={assignment.locked ? 'secondary' : 'ghost'}
          loading={lockingAssignment}
          disabled={lockingAssignment || lockingId !== null}
          onClick={() => void handleToggleAssignmentLock()}
        >
          {assignment.locked ? (
            <>
              <Unlock className="h-4 w-4" />
              Unlock worksheet
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Lock worksheet
            </>
          )}
        </Button>
      </div>

      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {exportError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {exportError}
        </Card>
      ) : null}

      {lockError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {lockError}
        </Card>
      ) : null}

      {showingSamples ? (
        <Card padding="md" className="border-gold/30 bg-gold/10 text-sm text-fg">
          Showing sample submissions for preview. Real learner answers will appear here once submitted.
        </Card>
      ) : null}

      {submissions.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-muted">No learners have submitted this worksheet yet.</p>
          <p className="mt-2 text-sm text-muted">
            You can still lock the worksheet above so learners cannot submit until you unlock it.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => {
            const label =
              submission.learnerName ||
              getDisplayName({
                name: submission.learnerName ?? '',
                firstName: submission.learnerFirstName ?? '',
                lastName: submission.learnerLastName ?? '',
              })

            return (
              <Card key={submission.id} padding="md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-fg">{label}</p>
                      {submission.locked ? (
                        <Badge tone="muted">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {submission.learnerPhone
                        ? formatPhoneDisplay(submission.learnerPhone)
                        : 'No phone on file'}
                      {' · '}
                      Submitted {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={lockingId === submission.id}
                      disabled={lockingId !== null || lockingAssignment}
                      onClick={() => void handleToggleLock(submission)}
                    >
                      {submission.locked ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Lock
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleExport(submission)}
                    >
                      <FileDown className="h-4 w-4" />
                      Export PDF
                    </Button>
                    <ButtonLink
                      to={`/admin/assignments/${assignment.id}/submissions/${submission.id}`}
                      variant="primary"
                      size="sm"
                    >
                      View answers
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
