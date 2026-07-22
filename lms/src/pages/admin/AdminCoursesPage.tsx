import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { apiAdminDeleteCourse, apiAdminReorderCourses, apiAdminSetCoursePublished } from '@/lib/supabase/lmsApi'
import { ReorderControls, ReorderDropZone } from '@/components/admin/ReorderControls'
import { CoursePublishBadge, CoursePublishToggle } from '@/components/admin/CoursePublishControls'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { CourseThumbnail } from '@/components/shared/CourseThumbnail'
import { resolveCourseThumbnail } from '@/lib/courseImages'
import type { Course } from '@/types'

function sortCourses(list: Course[]) {
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function AdminCoursesPage() {
  const { isAdmin } = useAuth()
  const { courses, refreshCourses } = useCourses()
  const [ordered, setOrdered] = useState<Course[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [reorderError, setReorderError] = useState('')
  const [reordering, setReordering] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const sortedFromContext = useMemo(() => sortCourses(courses), [courses])

  useEffect(() => {
    setOrdered(sortedFromContext)
  }, [sortedFromContext])

  const persistOrder = async (next: Course[]) => {
    setReorderError('')
    setReordering(true)
    const withOrder = next.map((c, i) => ({ ...c, sortOrder: i + 1 }))
    setOrdered(withOrder)
    try {
      await apiAdminReorderCourses(withOrder.map((c) => ({ id: c.id, sortOrder: c.sortOrder ?? 0 })))
      await refreshCourses(true)
    } catch (e) {
      setReorderError(e instanceof Error ? e.message : 'Could not save course order.')
      setOrdered(sortedFromContext)
    } finally {
      setReordering(false)
    }
  }

  const moveCourse = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ordered.length) return
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    void persistOrder(next)
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return
    let insertAt: number
    if (targetIndex >= ordered.length) {
      insertAt = ordered.length - 1
    } else if (dragIndex < targetIndex) {
      insertAt = targetIndex - 1
    } else {
      insertAt = targetIndex
    }
    if (dragIndex !== insertAt) {
      moveCourse(dragIndex, insertAt)
    }
    setDragIndex(null)
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

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleteError('')
    setDeleting(true)
    try {
      await apiAdminDeleteCourse(pendingDelete.id)
      await refreshCourses(true)
      setPendingDelete(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      {reorderError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {reorderError}
        </Card>
      ) : null}

      {deleteError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {deleteError}
        </Card>
      ) : null}

      {publishError ? (
        <Card padding="md" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {publishError}
        </Card>
      ) : null}

      {pendingDelete ? (
        <Card padding="md" className="border-danger/30 bg-danger/5">
          <p className="text-sm text-fg">
            Delete <strong>{pendingDelete.title}</strong> and all its lessons? This cannot be undone.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              className="!w-full sm:!w-auto text-danger hover:bg-danger/10"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              <Trash2 className="h-4 w-4" />
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!w-full sm:!w-auto"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {ordered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-muted">No courses yet. Create your first course.</p>
          <ButtonLink to="/admin/courses/new" pill className="mt-4 inline-flex !w-auto">
            Add course
          </ButtonLink>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Use the arrows or drag handle to set homepage order.{reordering ? ' Saving…' : null}
          </p>
          {ordered.map((course, idx) => (
            <div key={course.id} className="min-w-0">
              <ReorderDropZone
                index={idx}
                onDropAt={handleDrop}
                active={dragIndex !== null && dragIndex !== idx}
              />
              <Card padding="md" className="nf-admin-list-card">
                <div className="nf-admin-list-card__body">
                  <div className="nf-admin-list-card__main">
                    <ReorderControls
                      label={course.title}
                      position={idx}
                      total={ordered.length}
                      compact
                      onMoveUp={() => moveCourse(idx, idx - 1)}
                      onMoveDown={() => moveCourse(idx, idx + 1)}
                      onDragStart={() => setDragIndex(idx)}
                      onDragEnd={() => setDragIndex(null)}
                      isDragging={dragIndex === idx}
                    />
                    <div className="nf-admin-list-card__thumb">
                      <CourseThumbnail
                        src={resolveCourseThumbnail(course)}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted">
                          #{idx + 1}
                        </span>
                        <h3 className="min-w-0 break-words text-base font-bold leading-snug text-fg sm:text-lg">
                          {course.title}
                        </h3>
                        <CoursePublishBadge course={course} />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
                        {course.category} &middot; {course.lessons.length} lessons &middot; {course.level}
                      </p>
                    </div>
                  </div>

                  <div className="nf-admin-list-card__actions">
                    {isAdmin ? (
                      <CoursePublishToggle
                        course={course}
                        loading={togglingId === course.id}
                        disabled={deleting || reordering || togglingId !== null}
                        onToggle={(published) => handleTogglePublish(course.id, published)}
                      />
                    ) : null}
                    <ButtonLink to={`/courses/${course.id}`} variant="primary" size="sm" pill>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      View
                    </ButtonLink>
                    <ButtonLink to={`/admin/courses/${course.id}`} variant="secondary" size="sm" pill>
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit
                    </ButtonLink>
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/10"
                        disabled={deleting || reordering}
                        onClick={() => setPendingDelete({ id: course.id, title: course.title })}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </div>
          ))}
          <ReorderDropZone
            index={ordered.length}
            onDropAt={handleDrop}
            active={dragIndex !== null}
          />
        </div>
      )}
    </div>
  )
}
