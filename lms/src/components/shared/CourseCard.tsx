import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle, BookOpen, Clock } from 'lucide-react'
import type { Course } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { CourseThumbnail } from '@/components/shared/CourseThumbnail'
import { resolveCourseThumbnail } from '@/lib/courseImages'
import { richTextToPlain } from '@/utils/helpers'

interface CourseCardProps {
  course: Course
  percent: number
  courseHref: string
  actionHref: string
  index?: number
}

export function CourseCard({ course, percent, courseHref, actionHref, index = 0 }: CourseCardProps) {
  const complete = percent === 100
  const inProgress = percent > 0 && !complete

  return (
    <article
      className="group nf-course-card animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <Link to={courseHref} className="relative block aspect-[16/10] overflow-hidden">
        <CourseThumbnail
          src={resolveCourseThumbnail(course)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-accent/0 transition-colors duration-300 group-hover:bg-accent/15" />

        <div className="absolute left-4 top-4">
          <Badge tone={complete ? 'success' : 'brand'}>{complete ? 'Completed' : course.level}</Badge>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{course.category}</p>
          <h3 className="mt-1.5 text-base font-extrabold leading-snug text-white sm:text-lg">
            {course.title}
          </h3>
        </div>

        {inProgress ? (
          <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xs font-bold text-white ring-2 ring-accent backdrop-blur-md">
            {percent}%
          </div>
        ) : (
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            <PlayCircle className="h-5 w-5" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
          {richTextToPlain(course.shortDescription || course.description)}
        </p>

        {course.durationEstimate ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Clock className="h-3.5 w-3.5 text-accent" />
            {course.durationEstimate}
          </p>
        ) : null}

        <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-accent" />
              {course.lessons.length} lessons
            </span>
            <span className={inProgress ? 'text-accent' : ''}>{percent}% done</span>
          </div>
          <ProgressBar value={percent} size="sm" glow={inProgress} />

          <ButtonLink to={actionHref} variant={complete ? 'outline' : 'primary'} size="md" pill fullWidth className="mt-1">
              {complete ? (
                <>
                  <PlayCircle className="h-5 w-5" />
                  Review course
                </>
              ) : inProgress ? (
                <>
                  Continue learning
                  <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  Start course
                </>
              )}
            </ButtonLink>
        </div>
      </div>
    </article>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="nf-course-card overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-surface-2" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-surface-2" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-2" />
      </div>
    </div>
  )
}
