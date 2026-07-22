/**
 * Central image URLs for the LMS — update `imageUrls.js` to change assets app-wide.
 */
import {
  COURSE_COMMUNICATION,
  COURSE_DIGITAL_BASICS,
  COURSE_WORK_READINESS,
  FAVICON,
  HERO_GALLERY,
  HERO_PRIMARY,
  AUTH_MARKETING_IMAGE,
  IATWP_LOGO,
  LOGO_ON_DARK,
  LOGO_ON_LIGHT,
} from './imageUrls.js'

export const IMAGES = {
  favicon: FAVICON,
  logo: {
    onDark: LOGO_ON_DARK,
    onLight: LOGO_ON_LIGHT,
  },
  heroes: {
    primary: HERO_PRIMARY,
    gallery: HERO_GALLERY,
  },
  auth: {
    marketing: AUTH_MARKETING_IMAGE,
    partnerLogo: IATWP_LOGO,
  },
  courses: {
    digitalBasics: COURSE_DIGITAL_BASICS,
    communication: COURSE_COMMUNICATION,
    workReadiness: COURSE_WORK_READINESS,
  },
} as const
