import { IMAGES } from '@/content/images'

/** Every site-wide image an admin can replace from the Media tab. */
export const SITE_IMAGE_DEFS = [
  {
    key: 'logoOnDark',
    label: 'NerdzFactory logo',
    hint: 'Shown in the header, footer, and on the sign-in / sign-up pages. Use a white/light wordmark that reads well on dark backgrounds.',
    default: IMAGES.logo.onDark,
  },
  {
    key: 'partnerLogo',
    label: 'Partnership logo',
    hint: 'The Indigenous Apprenticeship to Work Program logo on the sign-in and sign-up pages.',
    default: IMAGES.auth.partnerLogo,
  },
  {
    key: 'favicon',
    label: 'Browser tab icon (favicon)',
    hint: 'Small square icon shown in the browser tab. A square PNG works best.',
    default: IMAGES.favicon,
  },
  {
    key: 'learnerHero',
    label: 'Dashboard welcome photo',
    hint: 'The large photo beside the "Hello" greeting on the learner dashboard.',
    default: IMAGES.heroes.primary,
  },
  {
    key: 'courseFallback',
    label: 'Default course artwork',
    hint: 'Used for any course that has no thumbnail and no video preview.',
    default: IMAGES.courses.digitalBasics,
  },
] as const

export type SiteImageKey = (typeof SITE_IMAGE_DEFS)[number]['key']

export const SITE_IMAGE_DEFAULTS = Object.fromEntries(
  SITE_IMAGE_DEFS.map((d) => [d.key, d.default]),
) as Record<SiteImageKey, string>

/** WordPress blocks hotlinking from the LMS — ignore saved overrides that still point there. */
export function isUsableSiteImageOverride(_key: SiteImageKey, url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.includes('nerdzfactory.co/wp-content/uploads/')) return false
  return true
}
