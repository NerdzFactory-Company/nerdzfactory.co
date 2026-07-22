import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react'
import {
  apiStaffListAssignments,
  apiStaffUpsertAssignment,
} from '@/lib/supabase/lmsApi'
import type { Assignment, AssignmentQuestion, AssignmentQuestionType } from '@/types'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { cn, isRichTextEmpty, richTextToPlain } from '@/utils/helpers'

const QUESTION_TYPES: { value: AssignmentQuestionType; label: string }[] = [
  { value: 'textarea', label: 'Long answer' },
  { value: 'text', label: 'Short answer' },
  { value: 'radio', label: 'Choose one option' },
  { value: 'checkbox', label: 'Choose many options' },
]

function newQuestionId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyQuestion(): AssignmentQuestion {
  return { id: newQuestionId(), label: '', type: 'textarea', required: true }
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function AdminAssignmentEditPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const isNew = !assignmentId
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [notFound, setNotFound] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await apiStaffListAssignments()
        if (cancelled) return
        const existing = list.find((a) => a.id === assignmentId)
        if (!existing) {
          setNotFound(true)
          return
        }
        setTitle(existing.title)
        setSlug(existing.id)
        setDescription(existing.description)
        setPublished(existing.published)
        setSortOrder(existing.sortOrder)
        setQuestions(existing.questions.length ? existing.questions : [emptyQuestion()])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the assignment.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isNew, assignmentId])

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (isNew) setSlug(slugify(v))
  }

  const updateQuestion = (idx: number, patch: Partial<AssignmentQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const options = [...(q.options ?? [])]
        options[oIdx] = value
        return { ...q, options }
      }),
    )
  }

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: [...(q.options ?? []), ''] } : q)),
    )
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: (q.options ?? []).filter((_, j) => j !== oIdx) } : q,
      ),
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const id = slug.trim()
    if (!title.trim() || !id) {
      setError('Please enter a title for the assignment.')
      return
    }

    const cleaned: AssignmentQuestion[] = []
    for (const [i, q] of questions.entries()) {
      if (isRichTextEmpty(q.label)) continue
      const needsOptions = q.type === 'radio' || q.type === 'checkbox'
      const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean)
      if (needsOptions && options.length < 2) {
        setError(`Question ${i + 1} ("${richTextToPlain(q.label).trim()}") needs at least 2 options.`)
        return
      }
      cleaned.push({
        id: q.id,
        label: q.label,
        type: q.type,
        required: q.required ?? false,
        ...(q.section?.trim() ? { section: q.section.trim() } : {}),
        ...(q.context?.trim() ? { context: q.context.trim() } : {}),
        ...(needsOptions ? { options } : {}),
      })
    }
    if (!cleaned.length) {
      setError('Add at least one question with a label.')
      return
    }

    const assignment: Assignment = {
      id,
      title: title.trim(),
      description: description.trim(),
      questions: cleaned,
      sortOrder,
      published,
    }

    setSaving(true)
    try {
      await apiStaffUpsertAssignment(assignment)
      navigate('/admin/assignments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSpinner className="py-16" />

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted">Assignment not found.</p>
        <Link
          to="/admin/assignments"
          className="mt-4 inline-block font-semibold text-accent hover:underline"
        >
          Back to assignments
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="nf-admin-form">
      <Link
        to="/admin/assignments"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignments
      </Link>

      <Card padding="lg" className="space-y-5">
        <h2 className="text-lg font-bold text-fg">
          {isNew ? 'New assignment' : 'Edit assignment'}
        </h2>

        <Input
          label="Title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Worksheet 11 — Welding & Fabrication"
        />

        {isNew ? (
          <Input
            label="Web address (auto-generated)"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            hint="Part of the link learners open. Cannot be changed after saving."
          />
        ) : null}

        <RichTextEditor
          label="Description"
          value={description}
          onChange={setDescription}
          minRows={2}
          hint="Shown on the worksheet card and at the top of the worksheet."
        />

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span className="text-sm font-semibold text-fg">
              Published <span className="font-normal text-muted">(visible to learners)</span>
            </span>
          </label>

          <Input
            label="Sort position"
            type="number"
            value={String(sortOrder)}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="max-w-[140px]"
            hint="Lower shows first"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-base font-bold text-fg">Questions</h3>

        {questions.map((question, idx) => {
          const needsOptions = question.type === 'radio' || question.type === 'checkbox'
          return (
            <Card key={question.id} padding="md" className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-muted">Question {idx + 1}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, 1)}
                    disabled={idx === questions.length - 1}
                    className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    disabled={questions.length === 1}
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Textarea
                label="Question"
                value={question.label}
                onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                rows={2}
                placeholder="What should the learner answer?"
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-sm font-semibold text-fg">Answer type</label>
                  <select
                    value={question.type}
                    onChange={(e) => {
                      const type = e.target.value as AssignmentQuestionType
                      updateQuestion(idx, {
                        type,
                        options:
                          type === 'radio' || type === 'checkbox'
                            ? question.options?.length
                              ? question.options
                              : ['', '']
                            : undefined,
                      })
                    }}
                    className="nf-select !h-11 !text-sm sm:!h-12"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={question.required ?? false}
                    onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-fg">Required</span>
                </label>
              </div>

              {needsOptions ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-fg">Options</p>
                  {(question.options ?? []).map((option, oIdx) => (
                    <div key={oIdx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                        className="min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx, oIdx)}
                        disabled={(question.options ?? []).length <= 2}
                        className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                        aria-label="Remove option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="!w-auto"
                    onClick={() => addOption(idx)}
                  >
                    <Plus className="h-4 w-4" /> Add option
                  </Button>
                </div>
              ) : null}

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg">
                  Optional: section heading & helper text
                </summary>
                <div className="mt-3 space-y-3">
                  <Input
                    label="Section heading"
                    value={question.section ?? ''}
                    onChange={(e) => updateQuestion(idx, { section: e.target.value })}
                    hint="Shown above this question — start a new part of the worksheet."
                  />
                  <RichTextEditor
                    label="Helper text"
                    value={question.context ?? ''}
                    onChange={(context) => updateQuestion(idx, { context })}
                    minRows={2}
                    hint="Instructions or an example shown just above the question."
                  />
                </div>
              </details>
            </Card>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          className="!w-auto"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      {error ? (
        <p className={cn('rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger')}>
          {error}
        </p>
      ) : null}

      <div className="nf-admin-form-actions">
        <Button type="submit" size="lg" pill loading={saving} className="!w-full sm:!w-auto">
          <Save className="h-5 w-5" />
          {isNew ? 'Create assignment' : 'Save changes'}
        </Button>
        <Link to="/admin/assignments" className="text-center text-sm font-medium text-muted hover:text-fg sm:text-left">
          Cancel
        </Link>
      </div>
    </form>
  )
}
