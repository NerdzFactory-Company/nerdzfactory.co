import { ExternalLink, ListChecks, Lightbulb, BookMarked } from 'lucide-react'
import type { Lesson } from '@/types'
import { RichText } from '@/components/shared/RichText'

type LessonLearnerDetailsProps = {
  lesson: Lesson
}

export function LessonLearnerDetails({ lesson }: LessonLearnerDetailsProps) {
  const objectives = lesson.objectives ?? []
  const keyTakeaways = lesson.keyTakeaways ?? []
  const resources = lesson.resources ?? []

  if (
    !lesson.prerequisites?.trim() &&
    objectives.length === 0 &&
    keyTakeaways.length === 0 &&
    resources.length === 0
  ) {
    return null
  }

  return (
    <div className="mt-6 space-y-5 border-t border-border/60 pt-6">
      {lesson.prerequisites?.trim() ? (
        <div className="rounded-xl border border-border/50 bg-surface-2/40 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <BookMarked className="h-3.5 w-3.5 text-accent" />
            Before you watch
          </p>
          <RichText content={lesson.prerequisites} className="mt-2 text-sm text-fg" />
        </div>
      ) : null}

      {objectives.length > 0 ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <ListChecks className="h-4 w-4 text-accent" />
            What you&apos;ll learn
          </p>
          <ul className="mt-3 space-y-2">
            {objectives.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-sm leading-relaxed text-fg/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <RichText content={item} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {keyTakeaways.length > 0 ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <Lightbulb className="h-4 w-4 text-accent" />
            Key takeaways
          </p>
          <ul className="mt-3 space-y-2">
            {keyTakeaways.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-sm leading-relaxed text-fg/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <RichText content={item} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resources.length > 0 ? (
        <div>
          <p className="text-sm font-bold text-fg">Extra materials</p>
          <ul className="mt-3 space-y-2">
            {resources.map((resource) => (
              <li key={`${resource.label}-${resource.url}`}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  {resource.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
