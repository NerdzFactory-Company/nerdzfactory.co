import type { Lesson } from '@/types'
import { isRichTextEmpty } from '@/utils/helpers'

/** Strip empty rows before saving */
export function normalizeLessonForSave(lesson: Lesson): Lesson {
  const objectives = (lesson.objectives ?? []).filter((s) => !isRichTextEmpty(s))
  const keyTakeaways = (lesson.keyTakeaways ?? []).filter((s) => !isRichTextEmpty(s))
  const resources = (lesson.resources ?? [])
    .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
    .filter((r) => r.label && r.url)

  return {
    ...lesson,
    prerequisites: lesson.prerequisites?.trim() ?? '',
    thumbnailUrl: lesson.thumbnailUrl?.trim() ?? '',
    objectives,
    keyTakeaways,
    resources,
  }
}

/** Ensure lists are editable in the form after loading from API */
export function hydrateLessonForForm(lesson: Lesson): Lesson {
  return {
    ...lesson,
    objectives: lesson.objectives?.length ? [...lesson.objectives] : [''],
    keyTakeaways: lesson.keyTakeaways?.length ? [...lesson.keyTakeaways] : [''],
    resources: lesson.resources?.length ? lesson.resources.map((r) => ({ ...r })) : [{ label: '', url: '' }],
  }
}
