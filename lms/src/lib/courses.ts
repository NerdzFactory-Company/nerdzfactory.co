import type { Course, Lesson } from '@/types'

export function sortedLessons(course: Course): Lesson[] {
  return [...course.lessons].sort((a, b) => a.order - b.order)
}

export function isCoursePublished(course: Course): boolean {
  return course.published !== false
}

/** Courses visible on the learner dashboard and course catalog. */
export function publishedCourses(courses: Course[]): Course[] {
  return courses.filter(isCoursePublished)
}
