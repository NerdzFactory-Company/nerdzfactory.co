import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Lock, Unlock } from 'lucide-react'
import {
  apiStaffListAssignments,
  apiStaffListSubmissions,
  apiStaffSetSubmissionLocked,
} from '@/lib/supabase/lmsApi'
import { exportSubmissionPdf } from '@/lib/exportSubmissionPdf'
import type { Assignment, AssignmentSubmission } from '@/types'
import { SubmissionQaView } from '@/components/assignments/SubmissionQaView'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/shared/PageSpinner'

export function AdminAssignmentSubmissionPage() {
  const { assignmentId, submissionId } = useParams<{
    assignmentId: string
    submissionId: string
  }>()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [lockError, setLockError] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)

  const handleExport = () => {
    if (!assignment || !submission) return
    setExportError(null)
    try {
      exportSubmissionPdf(assignment, submission)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export this submission as a PDF.')
    }
  }

  const handleToggleLock = async () => {
    if (!submission || submission.id.startsWith('mock-')) {
      setLockError('Sample submissions cannot be locked.')
      return
    }
    setLockError(null)
    setLocking(true)
    try {
      const updated = await apiStaffSetSubmissionLocked(submission.id, !submission.locked)
      setSubmission((prev) => (prev ? { ...prev, ...updated } : updated))
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Could not update lock status.')
    } finally {
      setLocking(false)
    }
  }

  useEffect(() => {
    if (!assignmentId || !submissionId) return
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
        const sub = subs.find((s) => s.id === submissionId)
        if (!sub) {
          if (!cancelled) setError('Submission not found.')
          return
        }
        if (!cancelled) {
          setAssignment(found)
          setSubmission(sub)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load submission.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assignmentId, submissionId])

  if (loading) return <PageSpinner className="py-16" />

  if (!assignment || !submission) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-muted">{error ?? 'Submission not found.'}</p>
        <ButtonLink to="/admin/assignments" variant="secondary" className="mt-4">
          Back to assignments
        </ButtonLink>
      </Card>
    )
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <Link
        to={`/admin/assignments/${assignment.id}/submissions`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        All submissions
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-fg">{assignment.title}</h2>
            {submission.locked ? (
              <Badge tone="muted">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">Learner submission</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" loading={locking} onClick={() => void handleToggleLock()}>
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
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

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

      <SubmissionQaView assignment={assignment} submission={submission} />
    </div>
  )
}
