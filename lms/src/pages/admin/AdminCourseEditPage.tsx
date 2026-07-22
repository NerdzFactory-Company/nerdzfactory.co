import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Save, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { sortedLessons } from '@/lib/courses'
import {
  apiAdminDeleteLesson,
  apiAdminUpsertCourse,
  apiAdminUpsertLesson,
} from '@/lib/supabase/lmsApi'
import type { Course, Lesson } from '@/types'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { LessonEditorFields } from '@/components/admin/LessonEditorFields'
import { hydrateLessonForForm, normalizeLessonForSave } from '@/lib/lessonForm'
import { cn, isRichTextEmpty } from '@/utils/helpers'
import { ReorderDropZone } from '@/components/admin/ReorderControls'

type Tab = 'basics' | 'homepage' | 'lessons'

const emptyLesson = (): Lesson => ({
  id: `lesson-${Date.now()}`,
  title: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  duration: '',
  order: 1,
  prerequisites: '',
  objectives: [''],
  keyTakeaways: [''],
  resources: [{ label: '', url: '' }],
})

export function AdminCourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  // The "new course" route (/admin/courses/new) has no :courseId param.
  const isNew = !courseId || courseId === 'new'
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { getCourse, refreshCourses, loading: coursesLoading, courses } = useCourses()
  const existing = !isNew && courseId ? getCourse(courseId) : undefined

  const [formHydrated, setFormHydrated] = useState(isNew)

  const [tab, setTab] = useState<Tab>('basics')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [homepageContent, setHomepageContent] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [category, setCategory] = useState('General')
  const [level, setLevel] = useState<Course['level']>('Beginner')
  const [durationEstimate, setDurationEstimate] = useState('')
  const [timeToComplete, setTimeToComplete] = useState('')
  const [prerequisites, setPrerequisites] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [instructorName, setInstructorName] = useState('')
  const [instructorBio, setInstructorBio] = useState('')
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([''])
  const [published, setPublished] = useState(false)
  const [lessons, setLessons] = useState<Lesson[]>([emptyLesson()])
  const [dragLessonIndex, setDragLessonIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existing) return
    setTitle(existing.title)
    setSlug(existing.id)
    setDescription(existing.description)
    setShortDescription(existing.shortDescription ?? '')
    setHomepageContent(existing.homepageContent ?? '')
    setThumbnail(existing.thumbnail)
    setHeroImage(existing.heroImage ?? '')
    setCategory(existing.category)
    setLevel(existing.level)
    setDurationEstimate(existing.durationEstimate ?? '')
    setTimeToComplete(existing.timeToComplete ?? '')
    setPrerequisites(existing.prerequisites ?? '')
    setTargetAudience(existing.targetAudience ?? '')
    setInstructorName(existing.instructorName ?? '')
    setInstructorBio(existing.instructorBio ?? '')
    setLearningOutcomes(
      existing.learningOutcomes?.length ? existing.learningOutcomes : [''],
    )
    setPublished(existing.published !== false)
    setLessons(
      existing.lessons.length
        ? sortedLessons(existing).map((l) => hydrateLessonForForm({ ...l }))
        : [emptyLesson()],
    )
    setFormHydrated(true)
  }, [existing])

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (isNew) setSlug(slugify(v))
  }

  const updateLesson = (idx: number, patch: Partial<Lesson>) => {
    setLessons((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const addLesson = () => {
    setLessons((prev) => [...prev, { ...emptyLesson(), order: prev.length + 1 }])
  }

  const moveLesson = (from: number, to: number) => {
    if (from === to || to < 0 || to >= lessons.length) return
    setLessons((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleLessonDrop = (targetIndex: number) => {
    if (dragLessonIndex === null) {
      return
    }
    let insertAt: number
    if (targetIndex >= lessons.length) {
      insertAt = lessons.length - 1
    } else if (dragLessonIndex < targetIndex) {
      insertAt = targetIndex - 1
    } else {
      insertAt = targetIndex
    }
    if (dragLessonIndex !== insertAt) {
      moveLesson(dragLessonIndex, insertAt)
    }
    setDragLessonIndex(null)
  }

  const nextCourseSortOrder = useMemo(() => {
    if (existing?.sortOrder != null) return existing.sortOrder
    const max = courses.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0)
    return max + 1
  }, [courses, existing?.sortOrder])

  const removeLesson = async (idx: number) => {
    const lesson = lessons[idx]
    if (!isNew && lesson.id && !lesson.id.startsWith('lesson-')) {
      try {
        await apiAdminDeleteLesson(lesson.id)
      } catch {
        /* not saved yet */
      }
    }
    setLessons((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isNew && !formHydrated) {
      setError('Course is still loading. Please wait a moment.')
      return
    }
    setSaving(true)

    const id = slug.trim()
    if (!id || !title.trim()) {
      setError('Please enter a course title and web address.')
      setSaving(false)
      return
    }

    const lessonIdForSave = (courseId: string, lesson: Lesson, index: number) => {
      if (lesson.id && !lesson.id.startsWith('lesson-')) return lesson.id
      const base = `${courseId}-${slugify(lesson.title || `video-${index + 1}`)}`
      return base || `${courseId}-video-${index + 1}`
    }

    const course: Course = {
      id,
      title: title.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      homepageContent: homepageContent.trim(),
      thumbnail: thumbnail.trim(),
      heroImage: heroImage.trim(),
      category: category.trim(),
      level,
      durationEstimate: durationEstimate.trim(),
      timeToComplete: timeToComplete.trim(),
      prerequisites: prerequisites.trim(),
      targetAudience: targetAudience.trim(),
      instructorName: instructorName.trim(),
      instructorBio: instructorBio.trim(),
      learningOutcomes: learningOutcomes.filter((o) => !isRichTextEmpty(o)),
      certificateOffered: false,
      published: isAdmin ? published : isNew ? false : existing?.published !== false,
      lessons: lessons.map((l, i) => normalizeLessonForSave({ ...l, order: i + 1 })),
    }

    try {
      await apiAdminUpsertCourse({
        ...course,
        sortOrder: nextCourseSortOrder,
        published: isAdmin ? published : isNew ? false : existing?.published !== false,
      })
      for (const lesson of course.lessons) {
        if (lesson.title.trim() && lesson.videoUrl.trim()) {
          await apiAdminUpsertLesson(id, {
            ...lesson,
            id: lessonIdForSave(id, lesson, lesson.order - 1),
          })
        }
      }
      await refreshCourses(true)
      navigate('/admin/courses')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string; shortLabel: string }[] = [
    { id: 'basics', label: 'Basics', shortLabel: 'Basics' },
    { id: 'homepage', label: 'Course homepage', shortLabel: 'Homepage' },
    { id: 'lessons', label: 'Lessons & videos', shortLabel: 'Lessons' },
  ]

  if (!isNew && coursesLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!isNew && existing && !formHydrated) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!isNew && !coursesLoading && !existing) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted">Course not found.</p>
        <Link to="/admin/courses" className="mt-4 inline-block font-semibold text-accent hover:underline">
          Back to courses
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="nf-admin-form">
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </Link>

      <div className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-border px-4 scrollbar-thin sm:mx-0 sm:gap-1 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 sm:py-3',
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            <span className="sm:hidden">{t.shortLabel}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'basics' ? (
        <Card padding="lg" className="min-w-0 space-y-5">
          <h2 className="text-lg font-bold text-fg">Course basics</h2>
          <Input label="Course title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
          <Input
            label="Course web address"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="Used in the course link, e.g. digital-basics. Cannot be changed after creating the course."
            disabled={!isNew}
            required
          />
          <RichTextEditor
            label="Short description"
            value={shortDescription}
            onChange={setShortDescription}
            hint="Shown on course cards (1–2 sentences)"
            minRows={2}
          />
          <RichTextEditor label="Summary" value={description} onChange={setDescription} minRows={3} />
          <div className="nf-form-grid-2">
            <ImageUploadField
              label="Course thumbnail"
              hint="Shown on course cards. Leave blank to use the first video’s preview image."
              value={thumbnail}
              onChange={setThumbnail}
              uploadPath={`courses/${slug || 'new'}/thumbnail`}
              optional
            />
            <ImageUploadField
              label="Banner image"
              hint="Large image at the top of the course page. Optional."
              value={heroImage}
              onChange={setHeroImage}
              uploadPath={`courses/${slug || 'new'}/hero`}
              optional
            />
          </div>
          <div className="nf-form-grid-2-tight">
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="min-w-0">
              <label className="mb-2 block text-base font-semibold text-fg">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Course['level'])}
                className="nf-select"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="nf-form-grid-2-tight">
            <Input
              label="Total duration"
              value={durationEstimate}
              onChange={(e) => setDurationEstimate(e.target.value)}
              placeholder="e.g. 2 hours"
            />
            <Input
              label="Time to complete"
              value={timeToComplete}
              onChange={(e) => setTimeToComplete(e.target.value)}
              placeholder="e.g. 1 week at 20 min/day"
            />
          </div>
          <div className="space-y-2">
            {isAdmin ? (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-accent"
                />
                <span>
                  <span className="font-medium text-fg">Published — visible to learners</span>
                  <span className="mt-1 block text-sm text-muted">
                    Uncheck to unpublish. The course stays in the staff panel but is hidden from learners
                    until you publish it again.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted">
                Publish status:{' '}
                <span className="font-semibold text-fg">
                  {published ? 'Published' : 'Unpublished'}
                </span>
                . Only admins can change publish status.
              </p>
            )}
          </div>
        </Card>
      ) : null}

      {tab === 'homepage' ? (
        <Card padding="lg" className="min-w-0 space-y-5">
          <h2 className="text-lg font-bold text-fg">Course homepage content</h2>
          <p className="text-sm text-muted">
            This is what learners see when they open a course before starting the videos.
          </p>
          <RichTextEditor
            label="Full course description"
            value={homepageContent}
            onChange={setHomepageContent}
            hint="Detailed overview — use the toolbar for headings, bold text, bullets, and links."
            minRows={8}
          />
          <RichTextEditor
            label="Who is this course for?"
            value={targetAudience}
            onChange={setTargetAudience}
            minRows={3}
          />
          <RichTextEditor
            label="Prerequisites"
            value={prerequisites}
            onChange={setPrerequisites}
            minRows={2}
          />
          <div>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-semibold text-fg">What you will learn</label>
              <Button type="button" variant="secondary" size="sm" onClick={() => setLearningOutcomes((o) => [...o, ''])} className="!w-auto">
                <Plus className="h-4 w-4" /> Add outcome
              </Button>
            </div>
            <div className="space-y-2">
              {learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <RichTextEditor
                      value={outcome}
                      onChange={(value) =>
                        setLearningOutcomes((prev) => prev.map((o, i) => (i === idx ? value : o)))
                      }
                      minRows={1}
                    />
                  </div>
                  {learningOutcomes.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setLearningOutcomes((o) => o.filter((_, i) => i !== idx))}
                      className="shrink-0 self-end rounded-lg p-3 text-danger sm:self-center"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <Input label="Instructor name" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
          <RichTextEditor label="Instructor bio" value={instructorBio} onChange={setInstructorBio} minRows={3} />
        </Card>
      ) : null}

      {tab === 'lessons' ? (
        <Card padding="lg" className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-fg">Lessons & videos</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addLesson} className="!w-full sm:!w-auto">
              <Plus className="h-4 w-4" /> Add lesson
            </Button>
          </div>
          <p className="text-sm text-muted">
            Drag the handle or use the arrows to change lesson order. Order is saved when you click Save course.
          </p>
          {lessons.map((lesson, idx) => (
            <div key={lesson.id}>
              <ReorderDropZone
                index={idx}
                onDropAt={handleLessonDrop}
                active={dragLessonIndex !== null && dragLessonIndex !== idx}
              />
              <LessonEditorFields
                lesson={lesson}
                index={idx}
                totalLessons={lessons.length}
                canRemove={lessons.length > 1}
                onChange={(patch) => updateLesson(idx, patch)}
                onRemove={() => removeLesson(idx)}
                onMoveUp={() => moveLesson(idx, idx - 1)}
                onMoveDown={() => moveLesson(idx, idx + 1)}
                onDragStart={() => setDragLessonIndex(idx)}
                onDragEnd={() => setDragLessonIndex(null)}
                isDragging={dragLessonIndex === idx}
                videoUploadPath={`courses/${slug || 'new'}/lessons`}
              />
            </div>
          ))}
          <ReorderDropZone
            index={lessons.length}
            onDropAt={handleLessonDrop}
            active={dragLessonIndex !== null}
          />
        </Card>
      ) : null}

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

      <div className="nf-admin-form-actions">
        <Button type="submit" size="lg" pill loading={saving} className="!w-full sm:!w-auto">
          <Save className="h-5 w-5" />
          Save course
        </Button>
      </div>
    </form>
  )
}
