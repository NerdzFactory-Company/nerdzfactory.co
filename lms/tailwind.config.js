/** @type {import('tailwindcss').Config} */
import { HERO_PRIMARY } from './src/content/imageUrls.js'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3e8cff',
          50: '#eff5ff',
          100: '#dbe8ff',
          200: '#bed5ff',
          300: '#91b8ff',
          400: '#5d92ff',
          500: '#3e8cff',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3aa8',
          900: '#1e3a8a',
        },
        gold: {
          DEFAULT: '#F7A51C',
          light: '#fbbf24',
        },
        ink: {
          950: '#070d1a',
          900: '#0B1120',
          800: '#111a30',
          700: '#1b2540',
          600: '#243152',
          500: '#3a486d',
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        pill: '25px',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        elevated: '0 16px 40px -12px rgba(62, 140, 255, 0.18), 0 8px 24px rgba(15, 23, 42, 0.08)',
        glow: '0 0 24px rgba(62, 140, 255, 0.35)',
        'glow-lg': '0 0 48px rgba(62, 140, 255, 0.4)',
      },
      backgroundImage: {
        'hero-pattern': `url('${HERO_PRIMARY}')`,
        'mesh-gradient':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(62,140,255,0.3), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(247,165,28,0.1), transparent)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
