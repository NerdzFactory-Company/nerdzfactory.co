import { useEffect, useState } from 'react'
import { ClipboardList, CheckCircle2, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiFetchAssignments, apiMySubmittedAssignmentIds } from '@/lib/supabase/lmsApi'
import type { Assignment } from '@/types'
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { richTextToPlain } from '@/utils/helpers'

export function AssignmentsPage() {
  const { isStaff } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [list, submitted] = await Promise.all([
          apiFetchAssignments(),
          isStaff ? Promise.resolve([] as string[]) : apiMySubmittedAssignmentIds(),
        ])
        if (cancelled) return
        setAssignments(list)
        setSubmittedIds(new Set(submitted))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load assignments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isStaff])

  return (
    <div className="min-w-0 space-y-8">
      {isStaff ? <AdminPreviewBanner /> : null}

      <div>
        <p className="nf-tagline">Assignments</p>
        <h1 className="mt-1 text-2xl font-extrabold text-fg sm:text-3xl">Worksheets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Complete each worksheet and submit your answers. You can update them until your instructor
          locks the worksheet.
        </p>
      </div>

      {error ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <PageSpinner className="py-16" />
      ) : assignments.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-muted">No assignments are available yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const done = submittedIds.has(assignment.id)
            return (
              <Link key={assignment.id} to={`/assignments/${assignment.id}`} className="group block">
                <Card
                  padding="md"
                  className="h-full transition-shadow hover:shadow-lg hover:ring-1 hover:ring-accent/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {assignment.locked ? (
                        <Badge tone="muted">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      ) : null}
                      {done ? (
                        <Badge tone="success">
                          <CheckCircle2 className="h-3 w-3" />
                          Submitted
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <h2 className="mt-4 font-bold text-fg group-hover:text-accent">{assignment.title}</h2>
                  {assignment.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">
                      {richTextToPlain(assignment.description)}
                    </p>
                  ) : null}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
