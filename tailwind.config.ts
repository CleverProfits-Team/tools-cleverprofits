import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        surface: '#FAFAFA',
        'surface-low': '#F4F4F4',
        cp: {
          'royal-blue': '#040B4D',
          'electric-blue': '#2605EF',
          'mid-navy': '#18197D',
          'dark-navy': '#18197D',
          navy: '#1508AC',
          'navy-black': '#0F0038',
          grey: '#D6D6D6',
          'light-grey': '#E7E7E7',
          bg: '#F8F8FC',
          'surface-sub': '#FAFAFA',
          border: '#E7E7E7',
          'input-bg': '#F4F4F4',
        },
        // Keep brand scale for backwards compat (now maps to CP electric blue)
        brand: {
          50: '#eeeeff',
          100: '#d5d4ff',
          200: '#b0adff',
          300: '#8a85ff',
          400: '#6560f5',
          500: '#2605EF',
          600: '#2605EF',
          700: '#1e04cc',
          800: '#1803b3',
          900: '#12028a',
          950: '#0a0155',
        },
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(4,11,77,0.06), 0 1px 2px -1px rgba(4,11,77,0.04)',
        'card-hover': '0 8px 28px -4px rgba(4,11,77,0.12), 0 4px 8px -4px rgba(4,11,77,0.06)',
        xs: '0 1px 2px 0 rgba(4,11,77,0.05)',
        elevated: '0 12px 32px -8px rgba(4,11,77,0.14), 0 4px 10px -4px rgba(4,11,77,0.06)',
        'glow-blue': '0 0 0 3px rgb(38 5 239 / 0.15)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
        'fade-in': 'fade-in 0.3s ease both',
      },
    },
  },
  plugins: [],
}

export default config
