/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12192B',
          900: '#12192B',
          800: '#1A2236',
          700: '#222C44',
          600: '#2E3A57',
          500: '#3F4D6E',
          400: '#5A6884',
          300: '#8893AD',
          200: '#B8C0D0',
          100: '#D8DCE6',
        },
        parchment: {
          DEFAULT: '#E7E1CF',
          dim: '#D8D0B8',
          deep: '#CCC39F',
          light: '#EFEADC',
          lighter: '#F4F0E2',
        },
        verified: {
          DEFAULT: '#1F6F5C',
          dark: '#18594A',
          light: '#2E8C76',
          tint: '#C6DDD5',
        },
        exception: {
          DEFAULT: '#8C3A2B',
          dark: '#6E2A1E',
          light: '#A84A38',
          tint: '#E2CFCB',
        },
        pending: {
          DEFAULT: '#B08A2E',
          dark: '#8C6D22',
          light: '#C9A347',
          tint: '#E6DCC0',
        },
        warmink: {
          DEFAULT: '#1B1F1A',
          soft: '#3A3F37',
          mute: '#6B6E63',
        },
        paper: {
          DEFAULT: '#EDE7D6',
          dim: '#C9C3B2',
        },
      },
      fontFamily: {
        slab: ['"IBM Plex Slab"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.125rem', { lineHeight: '1.7rem' }],
        xl: ['1.375rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.1rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.6rem' }],
      },
      borderRadius: {
        none: '0px',
        stamp: '14px',
        pill: '999px',
      },
      maxWidth: {
        ledger: '84ch',
      },
    },
  },
  plugins: [],
};
