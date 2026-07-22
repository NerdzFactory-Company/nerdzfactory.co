import type { AssignmentSubmission } from '@/types'

const MOCK_LEARNERS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    firstName: 'Ada',
    lastName: 'Okafor',
    phone: '+2348012345678',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    firstName: 'Chidi',
    lastName: 'Eze',
    phone: '+2348023456789',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    firstName: 'Fatima',
    lastName: 'Bello',
    phone: '+2348034567890',
  },
] as const

const WORKSHEET_01_ANSWERS: Record<string, string | string[]> = {
  master_name: 'Alhaji Musa Garment Works',
  q1_definition:
    'Fashion design and tailoring is creating clothes that fit the customer well and look professional. It matters because happy customers bring repeat business.',
  q2a_skills_checked: ['0', '1', '2'],
  q2b_skill_practice:
    'For measurements, I use a tape measure on the bust, waist, and hips, then write each number in my order book before cutting.',
  q3_scenario:
    'Taking measurements went wrong — I did not allow enough ease at the waist. Next time I will remeasure and add 2cm ease for fitted dresses.',
  q4_safety:
    'Pattern making failed because I cut without truing the side seams. I should pin the pattern and check alignment before cutting fabric.',
  q4_confidence: '2',
  q5a_commitment: 'Finishing and pressing — I will press every seam before handing over to the customer.',
  q5b_improvement:
    'By Friday I will complete one blouse with clean finishing and show my master before the customer collects it.',
  q5c_cross_trade:
    'I can share finishing tips with hair making learners — neat edges matter in both garment and weave work.',
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function getMockSubmissionsForAssignment(assignmentId: string): AssignmentSubmission[] {
  if (assignmentId !== 'worksheet-01-fashion-design-tailoring') return []

  return MOCK_LEARNERS.map((learner, index) => ({
    id: `mock-submission-${index + 1}`,
    assignmentId,
    learnerId: learner.id,
    answers: { ...WORKSHEET_01_ANSWERS },
    submittedAt: daysAgo(index + 1),
    learnerFirstName: learner.firstName,
    learnerLastName: learner.lastName,
    learnerName: `${learner.firstName} ${learner.lastName}`,
    learnerPhone: learner.phone,
  }))
}

export function shouldUseMockSubmissions(realCount: number): boolean {
  if (realCount > 0) return false
  // Explicit opt-in only — never auto-inject samples in local/production builds.
  return import.meta.env.VITE_LMS_MOCK_SUBMISSIONS === 'true'
}
