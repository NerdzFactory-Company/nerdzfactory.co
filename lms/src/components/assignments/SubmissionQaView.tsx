import type { Assignment, AssignmentSubmission } from '@/types'
import { formatAssignmentAnswer } from '@/lib/formatAssignmentAnswer'
import { questionsWithSectionHeadings } from '@/lib/assignmentForm'
import { formatPhoneDisplay } from '@/lib/phone'
import { getDisplayName } from '@/utils/userDisplay'
import { Card } from '@/components/ui/Card'
import { RichText } from '@/components/shared/RichText'

type SubmissionQaViewProps = {
  assignment: Assignment
  submission: AssignmentSubmission
}

export function SubmissionQaView({ assignment, submission }: SubmissionQaViewProps) {
  const learnerLabel =
    submission.learnerName ||
    getDisplayName({
      name: submission.learnerName ?? '',
      firstName: submission.learnerFirstName ?? '',
      lastName: submission.learnerLastName ?? '',
    })

  return (
    <div className="space-y-4">
      <Card padding="md" className="bg-surface-2/30">
        <p className="text-sm text-muted">
          <span className="font-semibold text-fg">{learnerLabel}</span>
          {submission.learnerPhone ? ` · ${formatPhoneDisplay(submission.learnerPhone)}` : ''}
        </p>
        <p className="mt-1 text-xs text-muted">
          Submitted {new Date(submission.submittedAt).toLocaleString()}
        </p>
      </Card>

      {questionsWithSectionHeadings(assignment.questions).map(({ question, showSection }) => {
        const answer = submission.answers[question.id]

        return (
          <Card key={question.id} padding="md" className="space-y-3">
            {showSection ? (
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{question.section}</p>
            ) : null}
            <div>
              <RichText content={question.label} className="font-semibold text-fg" />
              {question.context ? (
                <RichText content={question.context} className="mt-1 text-sm italic text-muted" />
              ) : null}
            </div>
            <div className="rounded-lg border border-border/50 bg-surface-2/40 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Answer</p>
              {question.type === 'textarea' && typeof answer === 'string' ? (
                <RichText content={answer} className="mt-2 text-sm leading-relaxed text-fg" />
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {formatAssignmentAnswer(question, answer)}
                </p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
