import type { ReactNode } from 'react'
import type { Assignment, AssignmentQuestion } from '@/types'
import { questionsWithSectionHeadings } from '@/lib/assignmentForm'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { RichText } from '@/components/shared/RichText'
import { cn, richTextToPlain } from '@/utils/helpers'

type AssignmentFormProps = {
  assignment: Assignment
  answers: Record<string, string | string[]>
  onChange: (answers: Record<string, string | string[]>) => void
  disabled?: boolean
}

function QuestionPrompt({
  label,
  required,
}: {
  label: string
  required?: boolean
}) {
  return (
    <div className="text-sm font-semibold text-fg sm:text-base">
      <RichText content={label} />
      {required ? <span className="text-danger"> *</span> : null}
    </div>
  )
}

/** Keeps each prompt visually attached to its own answer control. */
function QuestionBlock({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

export function AssignmentForm({ assignment, answers, onChange, disabled }: AssignmentFormProps) {
  const setValue = (id: string, value: string | string[]) => {
    onChange({ ...answers, [id]: value })
  }

  // Answers store the option text; String(idx) is matched for legacy drafts saved as indices.
  const isChecked = (question: AssignmentQuestion, option: string, idx: number) => {
    const current = answers[question.id]
    if (!Array.isArray(current)) return false
    return current.includes(option) || current.includes(String(idx))
  }

  const toggleCheckbox = (question: AssignmentQuestion, option: string, idx: number) => {
    const current = Array.isArray(answers[question.id]) ? [...(answers[question.id] as string[])] : []
    const next = isChecked(question, option, idx)
      ? current.filter((v) => v !== option && v !== String(idx))
      : [...current, option]
    setValue(question.id, next)
  }

  return (
    <div className="space-y-8">
      {questionsWithSectionHeadings(assignment.questions).map(({ question, showSection }) => (
        <div key={question.id} className="space-y-3">
          {showSection ? (
            <h3 className="border-b border-border/60 pb-2 text-base font-bold text-fg">{question.section}</h3>
          ) : null}

          {question.context ? (
            <RichText
              content={question.context}
              className="rounded-lg border border-border/50 bg-surface-2/40 px-4 py-3 text-sm leading-relaxed text-muted"
            />
          ) : null}

          {question.type === 'text' ? (
            <QuestionBlock>
              <QuestionPrompt label={question.label} required={question.required} />
              <Input
                value={(answers[question.id] as string) ?? ''}
                onChange={(e) => setValue(question.id, e.target.value)}
                disabled={disabled}
                required={question.required}
                aria-label={richTextToPlain(question.label)}
              />
            </QuestionBlock>
          ) : null}

          {question.type === 'textarea' ? (
            <QuestionBlock>
              <QuestionPrompt label={question.label} required={question.required} />
              <Textarea
                value={(answers[question.id] as string) ?? ''}
                onChange={(e) => setValue(question.id, e.target.value)}
                rows={4}
                disabled={disabled}
              />
            </QuestionBlock>
          ) : null}

          {question.type === 'checkbox' ? (
            <QuestionBlock>
              <QuestionPrompt label={question.label} required={question.required} />
              <div className="space-y-2">
                {(question.options ?? []).map((option, idx) => (
                  <label
                    key={`${question.id}-opt-${idx}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-surface px-4 py-3',
                      disabled && 'opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-accent"
                      checked={isChecked(question, option, idx)}
                      disabled={disabled}
                      onChange={() => toggleCheckbox(question, option, idx)}
                    />
                    <span className="text-sm text-fg">{option}</span>
                  </label>
                ))}
              </div>
            </QuestionBlock>
          ) : null}

          {question.type === 'radio' ? (
            <QuestionBlock>
              <QuestionPrompt label={question.label} required={question.required} />
              <div className="space-y-2">
                {(question.options ?? []).map((option, idx) => (
                  <label
                    key={`${question.id}-opt-${idx}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-surface px-4 py-3',
                      disabled && 'opacity-60',
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      className="mt-1 h-4 w-4 accent-accent"
                      checked={answers[question.id] === option || answers[question.id] === String(idx)}
                      disabled={disabled}
                      onChange={() => setValue(question.id, option)}
                    />
                    <span className="text-sm text-fg">{option}</span>
                  </label>
                ))}
              </div>
            </QuestionBlock>
          ) : null}
        </div>
      ))}
    </div>
  )
}
