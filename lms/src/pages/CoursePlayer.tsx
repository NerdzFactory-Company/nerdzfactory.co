import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  PartyPopper,
  PlayCircle,
} from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { sortedLessons, isCoursePublished } from '@/lib/courses'
import { useProgress } from '@/context/ProgressContext'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { CourseVideoPlayer } from '@/components/shared/CourseVideoPlayer'
import { cn, colorForName } from '@/utils/helpers'
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner'
import { UnpublishedCourseBanner } from '@/components/admin/UnpublishedCourseBanner'
import { CourseNav } from '@/components/shared/CourseNav'
import { LessonLearnerDetails } from '@/components/shared/LessonLearnerDetails'
import { RichText } from '@/components/shared/RichText'

export function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isStaff } = useAuth()
  const { getCourse, loading: coursesLoading } = useCourses()
  const course = courseId ? getCourse(courseId) : undefined
  const lessons = useMemo(() => (course ? sortedLessons(course) : []), [course])

  const { getCoursePercent, markLessonComplete, setLastLesson, isLessonComplete, saveError } =
    useProgress()
  const pct = course ? getCoursePercent(course) : 0

  const lessonFromUrl = searchParams.get('lesson')
  const [activeLessonId, setActiveLessonId] = useState('')
  const [marking, setMarking] = useState(false)
  const lastSavedLessonRef = useRef<string | null>(null)
  const setLastLessonRef = useRef(setLastLesson)

  useEffect(() => {
    setLastLessonRef.current = setLastLesson
  }, [setLastLesson])

  useEffect(() => {
    if (!lessons.length) return
    const fromUrl = lessonFromUrl && lessons.some((l) => l.id === lessonFromUrl) ? lessonFromUrl : null
    const nextId = fromUrl ?? lessons[0].id
    setActiveLessonId((current) => (current === nextId ? current : nextId))
  }, [lessons, lessonFromUrl])

  useEffect(() => {
    if (!course || !activeLessonId) return
    setSearchParams({ lesson: activeLessonId }, { replace: true })
  }, [course, activeLessonId, setSearchParams])

  useEffect(() => {
    if (!course || !activeLessonId) return
    if (lastSavedLessonRef.current === activeLessonId) return
    lastSavedLessonRef.current = activeLessonId
    void setLastLessonRef.current(course.id, activeLessonId).catch(() => {
      lastSavedLessonRef.current = null
    })
  }, [course, activeLessonId])

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

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0]
  const activeIdx = lessons.findIndex((l) => l.id === activeLesson?.id)
  const completedCount = lessons.filter((l) => isLessonComplete(course.id, l.id)).length
  const isActiveComplete = activeLesson ? isLessonComplete(course.id, activeLesson.id) : false

  const goToNext = () => {
    const next = lessons[activeIdx + 1]
    if (next) setActiveLessonId(next.id)
  }

  const handleMarkComplete = async () => {
    if (!activeLesson || isActiveComplete || marking) return
    setMarking(true)
    try {
      await markLessonComplete(course.id, activeLesson.id)
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <AdminPreviewBanner />
      <UnpublishedCourseBanner course={course} />
      <CourseNav courseId={course.id} courseTitle={course.title} current="learn" />

      {saveError ? (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Could not save progress: {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={pct === 100 ? 'success' : 'brand'} className="w-fit">
          {pct}% complete
        </Badge>
        <p className="text-sm text-muted">
          {completedCount} of {lessons.length} lessons done
        </p>
        {pct === 100 ? (
          <Badge tone="success">
            <PartyPopper className="h-3 w-3" /> Course complete!
          </Badge>
        ) : null}
      </div>

      <ProgressBar value={pct} glow className="max-w-full" />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        {/* On mobile: lesson list first (compact), then the video */}
        <Card
          padding="none"
          className="order-1 min-w-0 overflow-hidden nf-glass-card max-lg:max-h-[min(42vh,320px)] lg:order-2 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:scrollbar-thin"
        >
          <div className="border-b border-border/60 bg-surface-2/40 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Lessons</p>
            <p className="mt-1 text-base font-bold text-fg sm:text-lg">
              {completedCount}/{lessons.length} done
            </p>
          </div>
          <ul className="divide-y divide-border/40">
            {lessons.map((lesson, idx) => {
              const active = lesson.id === activeLesson?.id
              const done = isLessonComplete(course.id, lesson.id)
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-3.5 text-left transition-all ring-focus sm:px-4 sm:py-4',
                      active ? 'border-l-2 border-l-accent bg-accent/10' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md sm:h-11 sm:w-11',
                        done && 'ring-2 ring-success ring-offset-2 ring-offset-surface',
                      )}
                      style={{ background: colorForName(lesson.title) }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm font-semibold leading-snug',
                          active ? 'text-accent' : 'text-fg',
                        )}
                      >
                        {lesson.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{lesson.duration}</p>
                    </div>
                    {done ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <PlayCircle className="mt-1 h-5 w-5 shrink-0 text-muted/30" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <div className="order-2 min-w-0 space-y-4 lg:order-1">
          {activeLesson ? (
            <>
              <div className="aspect-video w-full min-w-0 overflow-hidden rounded-2xl">
                <CourseVideoPlayer videoUrl={activeLesson.videoUrl} title={activeLesson.title} />
              </div>
              <Card padding="none" className="overflow-hidden shadow-elevated">
                <div className="p-4 sm:p-6 md:p-8">
                  <h2 className="text-lg font-bold text-fg sm:text-xl md:text-2xl">
                    {activeLesson.title}
                  </h2>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="h-4 w-4 text-accent" />
                    {activeLesson.duration}
                  </p>
                  {activeLesson.description ? (
                    <RichText
                      content={activeLesson.description}
                      className="mt-4 text-base text-fg/90"
                    />
                  ) : null}
                  <LessonLearnerDetails lesson={activeLesson} />

                  <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 sm:mt-8 sm:flex-row">
                    <Button
                      variant={isActiveComplete ? 'secondary' : 'primary'}
                      size="lg"
                      pill
                      loading={marking}
                      disabled={isActiveComplete || marking}
                      onClick={() => void handleMarkComplete()}
                      className="w-full sm:w-auto sm:flex-none"
                    >
                      {isActiveComplete ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Lesson complete
                        </>
                      ) : (
                        <>
                          <Circle className="h-5 w-5" />
                          Mark lesson as done
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      pill
                      onClick={goToNext}
                      disabled={activeIdx >= lessons.length - 1}
                      className="w-full sm:w-auto sm:flex-none"
                    >
                      Next lesson
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
