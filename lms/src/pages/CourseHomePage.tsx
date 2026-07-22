import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Target,
} from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { sortedLessons, isCoursePublished } from '@/lib/courses'
import { useProgress, getResumeLessonId } from '@/context/ProgressContext'
import { useAuth } from '@/context/AuthContext'
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner'
import { UnpublishedCourseBanner } from '@/components/admin/UnpublishedCourseBanner'
import { resolveCourseHeroImage } from '@/lib/courseImages'
import { CourseNav } from '@/components/shared/CourseNav'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { CourseHero } from '@/components/shared/CourseHero'
import { RichText } from '@/components/shared/RichText'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Card } from '@/components/ui/Card'
import { richTextToPlain } from '@/utils/helpers'

export function CourseHomePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { isStaff } = useAuth()
  const { getCourse, loading: coursesLoading } = useCourses()
  const { getCoursePercent, getProgressForCourse } = useProgress()
  const course = courseId ? getCourse(courseId) : undefined

  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview')

  if (coursesLoading) {
    return <PageSpinner />
  }

  if (!course || (!isStaff && !isCoursePublished(course))) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted">Course not found.</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-accent hover:underline">
          Back to courses
        </Link>
      </div>
    )
  }

  const lessons = sortedLessons(course)
  const pct = getCoursePercent(course)
  const progress = getProgressForCourse(course.id)
  const resumeId = getResumeLessonId(course, progress)
  const learnUrl = `/courses/${course.id}/learn${resumeId ? `?lesson=${resumeId}` : ''}`
  const hero = resolveCourseHeroImage(course)

  const meta = [
    course.durationEstimate && { icon: Clock, label: 'Duration', value: course.durationEstimate },
    course.timeToComplete && { icon: Target, label: 'Time to complete', value: course.timeToComplete },
    { icon: BookOpen, label: 'Lessons', value: `${lessons.length} videos` },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[]

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <AdminPreviewBanner />
      <UnpublishedCourseBanner course={course} />
      <CourseNav courseId={course.id} courseTitle={course.title} current="overview" />

      <CourseHero
        course={course}
        heroImage={hero}
        percent={pct}
        learnUrl={learnUrl}
      />

      {/* Meta chips */}
      {meta.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {meta.map((item) => (
            <Card key={item.label} padding="md" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted">{item.label}</p>
                <p className="font-bold text-fg">{item.value}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 scrollbar-thin">
        {(['overview', 'curriculum'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-3 text-sm font-semibold capitalize transition-colors sm:px-5 ${
              activeTab === tab
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted hover:text-fg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card padding="lg">
              <h2 className="text-xl font-bold text-fg">About this course</h2>
              <RichText
                content={course.homepageContent || course.description}
                className="mt-4 text-muted"
              />
            </Card>

            {course.learningOutcomes && course.learningOutcomes.length > 0 ? (
              <Card padding="lg">
                <h2 className="text-xl font-bold text-fg">What you will learn</h2>
                <ul className="mt-4 space-y-3">
                  {course.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex gap-3 text-sm text-fg/90">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      <RichText content={outcome} />
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            {course.targetAudience ? (
              <Card padding="md">
                <h3 className="font-bold text-fg">Who is this for?</h3>
                <RichText content={course.targetAudience} className="mt-2 text-sm text-muted" />
              </Card>
            ) : null}
            {course.prerequisites ? (
              <Card padding="md">
                <h3 className="font-bold text-fg">Prerequisites</h3>
                <RichText content={course.prerequisites} className="mt-2 text-sm text-muted" />
              </Card>
            ) : null}
            {course.instructorBio ? (
              <Card padding="md">
                <h3 className="font-bold text-fg">About the instructor</h3>
                <RichText content={course.instructorBio} className="mt-2 text-sm text-muted" />
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-border">
            {lessons.map((lesson, idx) => (
              <li key={lesson.id}>
                <Link
                  to={`${learnUrl.split('?')[0]}?lesson=${lesson.id}`}
                  className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:gap-4 sm:px-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{lesson.title}</p>
                    {lesson.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {richTextToPlain(lesson.description)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted">{lesson.duration}</p>
                  </div>
                  <PlayCircle className="h-5 w-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-5">
            <ButtonLink to={learnUrl} pill className="w-full sm:w-auto">
              <PlayCircle className="h-5 w-5" />
              {pct > 0 ? 'Continue' : 'Start'} watching lessons
            </ButtonLink>
          </div>
        </Card>
      )}
    </div>
  )
}
