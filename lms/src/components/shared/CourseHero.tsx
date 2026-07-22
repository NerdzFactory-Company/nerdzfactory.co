import { PlayCircle, User } from 'lucide-react'
import type { Course } from '@/types'
import { richTextToPlain } from '@/utils/helpers'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CourseThumbnail } from '@/components/shared/CourseThumbnail'

type CourseHeroProps = {
  course: Course
  heroImage: string
  percent: number
  learnUrl: string
}

export function CourseHero({ course, heroImage, percent, learnUrl }: CourseHeroProps) {
  return (
    <section className="nf-split-hero">
      <div className="nf-split-hero__panel">
        <div className="nf-split-hero__content">
          <Badge tone="brand">{course.category}</Badge>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-fg sm:text-3xl md:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {richTextToPlain(course.shortDescription || course.description)}
          </p>

          {course.instructorName ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <User className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              Instructor:{' '}
              <span className="font-semibold text-fg">{course.instructorName}</span>
            </p>
          ) : null}

          <div className="mt-6 w-full max-w-sm space-y-4 rounded-2xl border border-border/60 bg-surface-2/50 p-4 sm:p-5">
            {percent > 0 ? <ProgressBar value={percent} showLabel glow /> : null}
            <ButtonLink to={learnUrl} size="lg" pill fullWidth>
              <PlayCircle className="h-5 w-5" />
              {percent === 100 ? 'Review lessons' : percent > 0 ? 'Continue learning' : 'Start course'}
            </ButtonLink>
            <Badge
              tone={course.level === 'Advanced' ? 'gold' : 'brand'}
              className="w-full justify-center"
            >
              {course.level}
            </Badge>
          </div>
        </div>

        <div className="nf-split-hero__media" aria-hidden>
          <CourseThumbnail src={heroImage} priority className="nf-split-hero__photo" />
        </div>
      </div>
    </section>
  )
}
