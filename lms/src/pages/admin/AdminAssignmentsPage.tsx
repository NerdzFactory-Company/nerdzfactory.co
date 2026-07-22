import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Pencil, Plus, Users } from 'lucide-react'
import {
  apiEnsureAssignmentsSeeded,
  apiStaffListAssignments,
  apiStaffSubmissionCounts,
} from '@/lib/supabase/lmsApi'
import type { Assignment } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { richTextToPlain } from '@/utils/helpers'

export function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await apiEnsureAssignmentsSeeded()
        const [list, counts] = await Promise.all([
          apiStaffListAssignments(),
          apiStaffSubmissionCounts(),
        ])
        if (cancelled) return
        setAssignments(list)
        setSubmissionCounts(counts)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load assignments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <PageSpinner className="py-16" />

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <ButtonLink to="/admin/assignments/new" pill className="!w-full sm:!w-auto">
          <Plus className="h-4 w-4" />
          New assignment
        </ButtonLink>
      </div>

      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {assignments.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-muted">
            No assignments yet. Click <span className="font-semibold text-fg">New assignment</span>{' '}
            to create your first worksheet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              padding="md"
              className="group relative h-full transition-shadow hover:shadow-lg hover:ring-1 hover:ring-accent/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  {assignment.locked ? (
                    <Badge tone="muted">Locked</Badge>
                  ) : null}
                  <Badge tone={assignment.published ? 'success' : 'muted'}>
                    {assignment.published ? 'Published' : 'Draft'}
                  </Badge>
                  <Link
                    to={`/admin/assignments/${assignment.id}/edit`}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-accent"
                    aria-label={`Edit ${assignment.title}`}
                    title="Edit assignment"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <Link
                to={`/admin/assignments/${assignment.id}/submissions`}
                className="block after:absolute after:inset-0 after:content-['']"
              >
                <h2 className="mt-4 font-bold text-fg group-hover:text-accent">
                  {assignment.title}
                </h2>
              </Link>
              {assignment.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {richTextToPlain(assignment.description)}
                </p>
              ) : null}
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted">
                <Users className="h-3.5 w-3.5" />
                {submissionCounts[assignment.id] ?? 0} submission
                {(submissionCounts[assignment.id] ?? 0) === 1 ? '' : 's'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
