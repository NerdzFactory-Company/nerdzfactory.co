import type { AssignmentQuestion } from '@/types'
import { richTextToPlain } from '@/utils/helpers'

/** Resolve a stored answer to its option text (legacy submissions stored option indices). */
function resolveOption(question: AssignmentQuestion, raw: string): string {
  if (question.options?.includes(raw)) return raw
  if (/^\d+$/.test(raw.trim())) {
    const idx = parseInt(raw, 10)
    if (question.options?.[idx] !== undefined) return question.options[idx]
  }
  return raw
}

export function formatAssignmentAnswer(
  question: AssignmentQuestion,
  value: string | string[] | undefined,
): string {
  if (value === undefined || value === null || value === '') return '—'
  if (question.type === 'checkbox' && Array.isArray(value)) {
    if (!value.length) return '—'
    return value.map((v) => resolveOption(question, v)).join(', ')
  }
  if (question.type === 'radio' && question.options?.length) {
    return resolveOption(question, String(value))
  }
  if (Array.isArray(value)) return value.join(', ')
  return richTextToPlain(String(value))
}
