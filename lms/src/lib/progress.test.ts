import { describe, expect, it } from 'vitest'
import { getResumeLessonId } from '@/context/ProgressContext'
import type { Course, CourseProgress } from '@/types'

const course: Course = {
  id: 'test-course',
  title: 'Test',
  description: '',
  thumbnail: '',
  category: 'General',
  level: 'Beginner',
  lessons: [
    { id: 'l1', title: 'One', description: '', videoUrl: '', duration: '5m', order: 1 },
    { id: 'l2', title: 'Two', description: '', videoUrl: '', duration: '5m', order: 2 },
    { id: 'l3', title: 'Three', description: '', videoUrl: '', duration: '5m', order: 3 },
  ],
}

describe('getResumeLessonId', () => {
  it('returns first lesson when there is no progress', () => {
    expect(getResumeLessonId(course)).toBe('l1')
  })

  it('returns first incomplete lesson when some are done', () => {
    const progress: CourseProgress = {
      userId: 'u1',
      courseId: 'test-course',
      completedLessonIds: ['l1'],
      lastLessonId: 'l1',
      updatedAt: '',
    }
    expect(getResumeLessonId(course, progress)).toBe('l2')
  })

  it('returns last lesson when all are complete', () => {
    const progress: CourseProgress = {
      userId: 'u1',
      courseId: 'test-course',
      completedLessonIds: ['l1', 'l2', 'l3'],
      lastLessonId: 'l3',
      updatedAt: '',
    }
    expect(getResumeLessonId(course, progress)).toBe('l3')
  })

  it('returns empty string when course has no lessons', () => {
    expect(getResumeLessonId({ ...course, lessons: [] })).toBe('')
  })
})
