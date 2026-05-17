/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette extracted from nerdzfactory.co
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
        // Dark theme base — matches main site
        ink: {
          950: '#070d1a',
          900: '#0B1120',
          800: '#111a30',
          700: '#1b2540',
          600: '#243152',
          500: '#3a486d',
        },
        // Semantic tokens — resolve to CSS variables so they switch with theme
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
        info: '#2563eb',
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
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        elevated: '0 10px 30px -10px rgba(0, 0, 0, 0.25)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
