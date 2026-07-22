import type { Assignment, AssignmentQuestion } from '@/types'
import { isRichTextEmpty, richTextToPlain } from '@/utils/helpers'

/** Pair each question with whether its section heading should render. */
export function questionsWithSectionHeadings(questions: AssignmentQuestion[]) {
  let lastSection = ''
  return questions.map((question) => {
    const showSection = Boolean(question.section && question.section !== lastSection)
    if (question.section) lastSection = question.section
    return { question, showSection }
  })
}

export function validateAssignmentAnswers(
  assignment: Assignment,
  answers: Record<string, string | string[]>,
): string | null {
  for (const question of assignment.questions) {
    if (!question.required) continue
    const value = answers[question.id]
    const plainLabel = richTextToPlain(question.label)
    if (question.type === 'checkbox') {
      if (!Array.isArray(value) || value.length === 0) {
        return `Please answer: ${plainLabel}`
      }
    } else if (
      !value ||
      (typeof value === 'string' && (question.type === 'textarea' ? isRichTextEmpty(value) : !value.trim()))
    ) {
      return `Please answer: ${plainLabel}`
    }
  }
  return null
}
