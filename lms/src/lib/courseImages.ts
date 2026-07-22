import type { Course } from '@/types'
import { videoThumbnailUrl } from '@/utils/helpers'

function sortedLessons(course: Course) {
  return [...course.lessons].sort((a, b) => a.order - b.order)
}

/**
 * Card/list thumbnail — custom image or first video preview.
 * Returns '' when neither exists; CourseThumbnail applies the site-wide
 * default artwork (editable from the admin Media tab).
 */
export function resolveCourseThumbnail(course: Course): string {
  if (course.thumbnail?.trim()) return course.thumbnail.trim()
  for (const lesson of sortedLessons(course)) {
    const thumb = videoThumbnailUrl(lesson.videoUrl, lesson.thumbnailUrl)
    if (thumb) return thumb
  }
  return ''
}

/** Large banner on the course page. */
export function resolveCourseHeroImage(course: Course): string {
  if (course.heroImage?.trim()) return course.heroImage.trim()
  if (course.thumbnail?.trim()) return course.thumbnail.trim()
  return resolveCourseThumbnail(course)
}
