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
        sans:    ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // CleverProfits brand kit — canonical tokens
        cp: {
          'royal-blue':       '#0F0038', // Primary brand surface, headings, sidebar
          'royal-blue-hover': '#050D61',
          'electric-blue':    '#2605EF', // Interactive accents — light surfaces only
          'electric-hover':   '#1E04C7',
          'dark-navy':        '#18197D',
          'navy':             '#1508AC',
          'white':            '#FFFFFF',
          'grey':             '#D6D6D6',
          'light-grey':       '#E7E7E7',
          'background':       '#EEF2FB', // Page background
          'surface':          '#FFFFFF',
          'surface-subtle':   '#FAFAFA',
          'background-alt':   '#F0F0F8',
          'input-bg':         '#F4F4F4',
          'skeleton-mid':     '#EAEAEA',
        },
        // Brand 50–950 scale (electric-blue ramp)
        brand: {
          50:  '#EEEEFF',
          100: '#D5D4FF',
          200: '#B0ADFF',
          300: '#8A85FF',
          400: '#6560F5',
          500: '#2605EF',
          600: '#2605EF',
          700: '#1E04CC',
          800: '#1803B3',
          900: '#12028A',
          950: '#0A0155',
        },
      },
      boxShadow: {
        // All shadows are navy-tinted per brand kit
        xs:           '0 1px 2px 0 rgba(15,0,56,0.05)',
        sm:           '0 1px 3px rgba(15,0,56,0.08), 0 1px 2px rgba(15,0,56,0.04)',
        md:           '0 4px 12px rgba(15,0,56,0.12), 0 2px 6px rgba(15,0,56,0.06)',
        lg:           '0 12px 32px rgba(15,0,56,0.16), 0 4px 12px rgba(15,0,56,0.08)',
        xl:           '0 24px 64px rgba(15,0,56,0.20), 0 8px 24px rgba(15,0,56,0.10)',
        electric:     '0 8px 32px rgba(38,5,239,0.35)',
        card:         '0 1px 3px rgba(15,0,56,0.08), 0 1px 2px rgba(15,0,56,0.04)',
        'card-hover': '0 12px 32px rgba(15,0,56,0.16), 0 4px 12px rgba(15,0,56,0.08)',
        elevated:     '0 12px 32px rgba(15,0,56,0.16), 0 4px 12px rgba(15,0,56,0.08)',
        'glow-blue':  '0 0 0 3px rgba(38,5,239,0.15)',
        popup:        '2px 8px 23px 3px rgba(15,0,56,0.20)',
        'card-article': '0 20px 83px -32px rgba(15,0,56,0.25)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        '2xl':   '1rem',
        '3xl':   '1.5rem',
        button:  '20px',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
