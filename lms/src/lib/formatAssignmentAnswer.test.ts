import { describe, expect, it } from 'vitest'
import type { AssignmentQuestion } from '@/types'
import { formatAssignmentAnswer } from '@/lib/formatAssignmentAnswer'

const radio: AssignmentQuestion = {
  id: 'q1',
  type: 'radio',
  label: 'Pick one',
  options: ['Not confident', 'Somewhat confident', 'Very confident'],
}

const checkbox: AssignmentQuestion = {
  id: 'q2',
  type: 'checkbox',
  label: 'Pick many',
  options: ['Taking measurements', 'Cutting fabric', 'Sewing seams'],
}

describe('formatAssignmentAnswer', () => {
  it('returns a dash for empty answers', () => {
    expect(formatAssignmentAnswer(radio, undefined)).toBe('—')
    expect(formatAssignmentAnswer(radio, '')).toBe('—')
    expect(formatAssignmentAnswer(checkbox, [])).toBe('—')
  })

  it('resolves legacy index-based answers to option text', () => {
    expect(formatAssignmentAnswer(radio, '2')).toBe('Very confident')
    expect(formatAssignmentAnswer(checkbox, ['0', '2'])).toBe('Taking measurements, Sewing seams')
  })

  it('passes through value-based answers unchanged', () => {
    expect(formatAssignmentAnswer(radio, 'Somewhat confident')).toBe('Somewhat confident')
    expect(formatAssignmentAnswer(checkbox, ['Cutting fabric'])).toBe('Cutting fabric')
  })

  it('does not misread option text that starts with a digit as an index', () => {
    const q: AssignmentQuestion = {
      id: 'q3',
      type: 'radio',
      label: 'Pick one',
      options: ['1 year', '2 years', '3+ years'],
    }
    expect(formatAssignmentAnswer(q, '2 years')).toBe('2 years')
  })
})
