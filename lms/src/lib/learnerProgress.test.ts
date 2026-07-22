import { describe, expect, it } from 'vitest'
import {
  buildCourseProgressView,
  getLessonProgressStatus,
  summarizeLearnerProgress,
} from '@/lib/learnerProgress'
import type { Course, CourseProgress } from '@/types'

const course: Course = {
  id: 'c1',
  title: 'Course One',
  description: '',
  thumbnail: '',
  category: 'General',
  level: 'Beginner',
  lessons: [
    { id: 'l1', title: 'Intro', description: '', videoUrl: '', duration: '5m', order: 1 },
    { id: 'l2', title: 'Basics', description: '', videoUrl: '', duration: '8m', order: 2 },
    { id: 'l3', title: 'Wrap-up', description: '', videoUrl: '', duration: '4m', order: 3 },
  ],
}

const progress: CourseProgress = {
  userId: 'u1',
  courseId: 'c1',
  completedLessonIds: ['l1'],
  lastLessonId: 'l2',
  updatedAt: '2026-07-01T12:00:00Z',
}

describe('getLessonProgressStatus', () => {
  it('marks completed lessons', () => {
    expect(getLessonProgressStatus('l1', progress)).toBe('completed')
  })

  it('marks last opened incomplete lesson as in progress', () => {
    expect(getLessonProgressStatus('l2', progress)).toBe('in_progress')
  })

  it('marks untouched lessons as not started', () => {
    expect(getLessonProgressStatus('l3', progress)).toBe('not_started')
  })

  it('returns not started when there is no course progress', () => {
    expect(getLessonProgressStatus('l1')).toBe('not_started')
  })
})

describe('buildCourseProgressView', () => {
  it('computes counts and last lesson title', () => {
    const view = buildCourseProgressView(course, progress)
    expect(view.completedCount).toBe(1)
    expect(view.inProgressCount).toBe(1)
    expect(view.percent).toBe(33)
    expect(view.lastLessonTitle).toBe('Basics')
    expect(view.lessons.map((l) => l.status)).toEqual(['completed', 'in_progress', 'not_started'])
  })
})

describe('summarizeLearnerProgress', () => {
  it('aggregates across courses', () => {
    const course2: Course = { ...course, id: 'c2', lessons: [] }
    const summary = summarizeLearnerProgress([course, course2], [progress])
    expect(summary.totalLessons).toBe(3)
    expect(summary.completedLessons).toBe(1)
    expect(summary.inProgressLessons).toBe(1)
    expect(summary.coursesStarted).toBe(1)
    expect(summary.overallPercent).toBe(33)
  })
})
