import type { Config } from 'tailwindcss'

/**
 * Stitch "Kinetic Editor" override. See CLAUDE.md "Design System Override".
 *
 * Layered token strategy:
 *   1. Stitch surface tier neutrals (no-line layering, exact Stitch values)
 *   2. `cp-*` brand tokens (Royal Blue, Electric Blue) — preserved
 *   3. Stitch primary/secondary/tertiary REMAPPED to brand colors
 *   4. Functional palette (success/warning/error) from brand kit, not Stitch
 *   5. Typography: display → Space Grotesk, sans → Inter (body)
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Brand kit typography (preserved through Stitch override): Inter = display, DM Sans = body.
        sans:    ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)',   'ui-sans-serif', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        // ── CleverProfits brand (preserved) ──────────────────────────────
        cp: {
          'royal-blue':       '#0F0038',
          'royal-blue-hover': '#050D61',
          'electric-blue':    '#2605EF',
          'electric-hover':   '#1E04C7',
          'dark-navy':        '#18197D',
          'navy':             '#1508AC',
          'white':            '#FFFFFF',
          'grey':             '#D6D6D6',
          'light-grey':       '#E7E7E7',
          'background':       '#EEF2FB',
          'surface':          '#FFFFFF',
          'surface-subtle':   '#FAFAFA',
          'background-alt':   '#F0F0F8',
          'input-bg':         '#F4F4F4',
          'skeleton-mid':     '#EAEAEA',
        },
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

        // ── Stitch primary/secondary/tertiary REMAPPED to brand ──────────
        primary:                    '#0F0038', // Royal Blue (Stitch had #1800b0)
        'primary-container':        '#2605EF', // Electric Blue (Stitch matches)
        'on-primary':               '#FFFFFF',
        'on-primary-container':     '#FFFFFF',
        'on-primary-fixed':         '#0A006B',
        'on-primary-fixed-variant': '#1E04CC',
        'primary-fixed':            '#E2DFFF',
        'primary-fixed-dim':        '#C1C1FF',
        'inverse-primary':          '#C1C1FF',

        secondary:                    '#5054b3',
        'secondary-container':        '#959afe',
        'on-secondary':               '#FFFFFF',
        'on-secondary-container':     '#292c8c',
        'secondary-fixed':            '#E1E0FF',
        'secondary-fixed-dim':        '#C0C1FF',
        'on-secondary-fixed':         '#04006D',
        'on-secondary-fixed-variant': '#373B99',

        tertiary:                    '#252d6a',
        'tertiary-container':        '#3d4482',
        'on-tertiary':               '#FFFFFF',
        'on-tertiary-container':     '#adb4fa',
        'tertiary-fixed':            '#dfe0ff',
        'tertiary-fixed-dim':        '#bdc2ff',
        'on-tertiary-fixed':         '#0b1252',
        'on-tertiary-fixed-variant': '#3a417f',

        // ── Stitch surface tiers (no-line layering, exact Stitch values) ──
        // Hierarchy intent (light→deep): bright > base > container-low > container > container-high > container-highest > dim
        surface:                       '#f9f9f9',
        'surface-bright':              '#f9f9f9',
        'surface-dim':                 '#dadada',
        'surface-tint':                '#4139ff',
        'surface-variant':             '#e2e2e2',
        'surface-container-lowest':    '#ffffff',
        'surface-container-low':       '#f4f3f3',
        'surface-container':           '#eeeeee',
        'surface-container-high':      '#e8e8e8',
        'surface-container-highest':   '#e2e2e2',
        'on-surface':                  '#1a1c1c',
        'on-surface-variant':          '#464557',
        'inverse-surface':             '#2f3131',
        'inverse-on-surface':          '#f1f1f1',

        outline:           '#767589',
        'outline-variant': '#c6c4da',
        background:        '#f9f9f9',
        'on-background':   '#1a1c1c',

        // ── Functional palette: brand kit (NOT Stitch's #ba1a1a) ──────────
        error:             '#DC2626',
        'on-error':        '#FFFFFF',
        'error-container': '#FFDAD6',
        'on-error-container': '#991B1B',
        success:           '#10B981',
        'on-success':      '#FFFFFF',
        warning:           '#F59E0B',
        'on-warning':      '#FFFFFF',
      },

      boxShadow: {
        // ── CP brand kit (navy-tinted, preserved) ────────────────────────
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

        // ── Stitch tonal-layering shadows (tertiary-tinted, extra-diffused) ──
        // From DESIGN.md §4. Use these for floating elements (dropdowns, modals).
        // Note tinted with Stitch tertiary (`#040b4d` ~= rgba(4,11,77,...)) for ambient feel.
        tonal:        '0 20px 40px rgba(4,11,77,0.06)',
        'tonal-lg':   '0 32px 64px rgba(4,11,77,0.08)',
        'tonal-xl':   '0 40px 80px rgba(4,11,77,0.10)',
      },

      borderRadius: {
        // Stitch baseline + CP brand button radius preserved.
        DEFAULT: '0.25rem',  // Stitch DEFAULT
        sm:      '0.25rem',
        lg:      '0.5rem',   // Stitch primary card radius
        xl:      '0.75rem',
        '2xl':   '1rem',     // CP "Standard Card"
        '3xl':   '1.5rem',
        '4xl':   '2rem',     // Stitch hero/feature card (rounded-[2rem])
        full:    '9999px',
        button:  '20px',
      },

      letterSpacing: {
        // Stitch editorial scale
        tightest:  '-0.04em',
        'extra-tight': '-0.03em',
        // -0.02em is Tailwind default `tight`
        'editorial': '-0.02em',
        wider:     '0.05em',  // Stitch label-md
        widest:    '0.18em',  // Stitch micro-label
      },

      backdropBlur: {
        // Stitch glassmorphism: 20px (DESIGN.md §2)
        glass: '20px',
      },

      backgroundImage: {
        // Stitch signature gradient: 135° primary → primary-container
        'kinetic-gradient':  'linear-gradient(135deg, #0F0038 0%, #2605EF 100%)',
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
