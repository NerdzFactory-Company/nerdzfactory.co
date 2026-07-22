import { type ComponentType } from 'react'
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Sparkles } from 'lucide-react'
import type { Course } from '@/types'
import { useSiteImages } from '@/context/SiteImagesContext'
import { LazyImage } from '@/components/shared/LazyImage'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { ProgressRing } from '@/components/ui/ProgressBar'

type LearnerHeroProps = {
  firstName: string
  overall: number
  coursesCount: number
  completedLessons: number
  totalLessons: number
  continueCourse?: Course
  continueHref?: string
}

export function LearnerHero({
  firstName,
  overall,
  coursesCount,
  completedLessons,
  totalLessons,
  continueCourse,
  continueHref,
}: LearnerHeroProps) {
  const { images } = useSiteImages()
  const lessonPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <section className="nf-learner-hero">
      <div className="nf-learner-hero__panel">
        <div className="nf-learner-hero__content">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Your learning space
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-fg sm:text-4xl lg:text-[2.75rem]">
            Hello, {firstName}
            <span className="text-gradient-brand">.</span>
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            {overall > 0
              ? 'You are making real progress. Pick up where you left off or explore another course below.'
              : 'Watch lessons at your own pace, mark them complete, and build skills that stick.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <HeroChip icon={BookOpen} label={`${coursesCount} course${coursesCount === 1 ? '' : 's'}`} />
            <HeroChip
              icon={GraduationCap}
              label={`${completedLessons}/${totalLessons} lessons`}
            />
            {totalLessons > 0 ? (
              <HeroChip icon={PlayCircle} label={`${lessonPct}% complete`} highlight />
            ) : null}
          </div>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            {continueCourse && continueHref ? (
              <ButtonLink to={continueHref} pill size="lg" className="sm:!w-auto">
                <PlayCircle className="h-5 w-5" />
                {overall > 0 ? 'Continue learning' : 'Start your first course'}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            ) : null}

            {overall > 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2/60 px-4 py-3">
                <ProgressRing value={overall} size={52} stroke={5} />
                <div>
                  <p className="text-lg font-extrabold text-fg">{overall}%</p>
                  <p className="text-xs font-medium text-muted">Overall progress</p>
                </div>
              </div>
            ) : null}
          </div>

          {continueCourse && overall > 0 ? (
            <p className="mt-4 text-sm text-muted">
              Up next:{' '}
              <span className="font-semibold text-fg">{continueCourse.title}</span>
            </p>
          ) : null}
        </div>

        <div className="nf-learner-hero__media" aria-hidden>
          <LazyImage
            src={images.learnerHero}
            alt=""
            wrapperClassName="block h-full w-full"
            className="nf-learner-hero__photo"
          />
          <div className="nf-learner-hero__frame" />
        </div>
      </div>
    </section>
  )
}

export function LearnerHeroSkeleton() {
  return (
    <section className="nf-learner-hero" aria-hidden>
      <div className="nf-learner-hero__panel animate-pulse">
        <div className="nf-learner-hero__content space-y-4">
          <div className="h-4 w-32 rounded bg-surface-2" />
          <div className="h-10 w-3/4 max-w-md rounded-lg bg-surface-2" />
          <div className="h-4 w-full max-w-lg rounded bg-surface-2" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-full bg-surface-2" />
            <div className="h-8 w-28 rounded-full bg-surface-2" />
          </div>
          <div className="h-12 w-48 rounded-full bg-surface-2" />
        </div>
        <div className="nf-learner-hero__media hidden lg:block">
          <div className="h-full min-h-[200px] rounded-2xl bg-surface-2" />
        </div>
      </div>
    </section>
  )
}

function HeroChip({
  icon: Icon,
  label,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  highlight?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-sm ${
        highlight
          ? 'border-gold/30 bg-gold/10 text-gold'
          : 'border-border/70 bg-surface-2/80 text-fg'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${highlight ? 'text-gold' : 'text-accent'}`} aria-hidden />
      {label}
    </span>
  )
}
