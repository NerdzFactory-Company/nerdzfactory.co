import { jsPDF } from 'jspdf'
import type { Assignment, AssignmentSubmission } from '@/types'
import { formatAssignmentAnswer } from '@/lib/formatAssignmentAnswer'
import { formatPhoneDisplay } from '@/lib/phone'
import { getDisplayName } from '@/utils/userDisplay'
import { richTextToPlain } from '@/utils/helpers'

function safeFilenamePart(value: string): string {
  return value
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

export function exportSubmissionPdf(assignment: Assignment, submission: AssignmentSubmission) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const addPageIfNeeded = (blockHeight: number) => {
    if (y + blockHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  const learnerLabel =
    submission.learnerName ||
    getDisplayName({
      name: submission.learnerName ?? '',
      firstName: submission.learnerFirstName ?? '',
      lastName: submission.learnerLastName ?? '',
    })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NerdzFactory Learning', margin, y)
  y += 22

  doc.setFontSize(14)
  const titleLines = doc.splitTextToSize(assignment.title || 'Worksheet', maxWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 16 + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Learner: ${learnerLabel || 'Unknown learner'}`, margin, y)
  y += 14
  if (submission.learnerPhone) {
    doc.text(`Phone: ${formatPhoneDisplay(submission.learnerPhone)}`, margin, y)
    y += 14
  }
  doc.text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, margin, y)
  y += 24
  doc.setTextColor(0, 0, 0)

  let lastSection = ''
  for (const question of assignment.questions) {
    if (question.section && question.section !== lastSection) {
      lastSection = question.section
      addPageIfNeeded(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(lastSection, margin, y)
      y += 16
    }

    addPageIfNeeded(60)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const questionLines = doc.splitTextToSize(richTextToPlain(question.label), maxWidth)
    doc.text(questionLines, margin, y)
    y += questionLines.length * 13 + 4

    if (question.context) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 90)
      const contextLines = doc.splitTextToSize(richTextToPlain(question.context), maxWidth)
      doc.text(contextLines, margin, y)
      y += contextLines.length * 11 + 6
      doc.setTextColor(0, 0, 0)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const answer = formatAssignmentAnswer(question, submission.answers[question.id])
    const answerLines = doc.splitTextToSize(answer, maxWidth)
    addPageIfNeeded(answerLines.length * 13 + 16)
    doc.text(answerLines, margin, y)
    y += answerLines.length * 13 + 18
  }

  const safeTitle = safeFilenamePart(assignment.title) || 'worksheet'
  const safeName = safeFilenamePart(learnerLabel) || 'submission'
  doc.save(`${safeTitle}-${safeName}.pdf`)
}
