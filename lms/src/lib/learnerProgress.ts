import { sortedLessons } from '@/lib/courses'
import type { Course, CourseProgress, Lesson } from '@/types'

export type LessonProgressStatus = 'completed' | 'in_progress' | 'not_started'

export type LessonProgressRow = {
  lesson: Lesson
  order: number
  status: LessonProgressStatus
}

export type CourseProgressView = {
  course: Course
  lessons: LessonProgressRow[]
  completedCount: number
  inProgressCount: number
  totalLessons: number
  percent: number
  lastActiveAt?: string
  lastLessonTitle?: string
}

export type LearnerProgressSummary = {
  courses: CourseProgressView[]
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  overallPercent: number
  coursesStarted: number
  coursesCompleted: number
}

export function getLessonProgressStatus(
  lessonId: string,
  courseProgress?: CourseProgress,
): LessonProgressStatus {
  if (!courseProgress) return 'not_started'
  if (courseProgress.completedLessonIds.includes(lessonId)) return 'completed'
  if (courseProgress.lastLessonId === lessonId) return 'in_progress'
  return 'not_started'
}

export function buildCourseProgressView(
  course: Course,
  courseProgress?: CourseProgress,
): CourseProgressView {
  const lessons = sortedLessons(course)
  const rows: LessonProgressRow[] = lessons.map((lesson, index) => ({
    lesson,
    order: index + 1,
    status: getLessonProgressStatus(lesson.id, courseProgress),
  }))

  const completedCount = rows.filter((r) => r.status === 'completed').length
  const inProgressCount = rows.filter((r) => r.status === 'in_progress').length
  const totalLessons = rows.length
  const percent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0

  const lastLesson = courseProgress?.lastLessonId
    ? lessons.find((l) => l.id === courseProgress.lastLessonId)
    : undefined

  return {
    course,
    lessons: rows,
    completedCount,
    inProgressCount,
    totalLessons,
    percent,
    lastActiveAt: courseProgress?.updatedAt,
    lastLessonTitle: lastLesson?.title,
  }
}

export function summarizeLearnerProgress(
  courses: Course[],
  learnerProgress: CourseProgress[],
): LearnerProgressSummary {
  const progressByCourse = new Map(learnerProgress.map((p) => [p.courseId, p]))
  const courseViews = courses.map((course) =>
    buildCourseProgressView(course, progressByCourse.get(course.id)),
  )

  const totalLessons = courseViews.reduce((s, c) => s + c.totalLessons, 0)
  const completedLessons = courseViews.reduce((s, c) => s + c.completedCount, 0)
  const inProgressLessons = courseViews.reduce((s, c) => s + c.inProgressCount, 0)
  const overallPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
  const coursesStarted = courseViews.filter(
    (c) => c.completedCount > 0 || c.inProgressCount > 0,
  ).length
  const coursesCompleted = courseViews.filter(
    (c) => c.totalLessons > 0 && c.completedCount === c.totalLessons,
  ).length

  return {
    courses: courseViews,
    totalLessons,
    completedLessons,
    inProgressLessons,
    overallPercent,
    coursesStarted,
    coursesCompleted,
  }
}
