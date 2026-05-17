/**
 * Design tokens extracted from nerdzfactory.co
 * Mirrored to CSS variables in src/styles/index.css and
 * Tailwind theme in tailwind.config.js. Reference these
 * only when you need a raw value in JS (e.g. inline chart colors).
 */
export const tokens = {
  colors: {
    brand: '#3e8cff',
    brandHover: '#2563eb',
    siteDark: '#0B1120',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
  },
  fonts: {
    heading: "'Montserrat', sans-serif",
    body: "'Montserrat', sans-serif",
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    elevated: '0 10px 30px -10px rgba(0,0,0,0.25)',
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const

export type Tokens = typeof tokens
