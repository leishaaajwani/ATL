/** @type {import('tailwindcss').Config} */

// Palette derived from GEMS Modern Academy brand assets:
//   * School site header navy   #0A1E43  -> navy.900
//   * School site gold bar      #A67C1F  -> gold.700
//   * Modern Eventure cards     #123A8A  -> navy.700
//   * Modern Eventure CTA gold  #D9A441  -> gold.500
//
// Navy carries structure AND primary action. Gold is an accent only: a rule, a
// status, an active marker. It is never the dominant button colour, because a
// screen with three gold buttons reads as a marketing page rather than as
// software somebody uses every day.

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f2f6fc',
          100: '#e1e9f8',
          200: '#c2d2f0',
          300: '#8fade5',
          400: '#5583d6',
          500: '#2a5fc4',
          600: '#1a4aa8',
          700: '#123a8a',   // Eventure feature surface
          800: '#0e2a5c',
          900: '#0a1e43',   // school site header
          950: '#050f22',
        },
        gold: {
          50:  '#fdf9f0',
          100: '#fbf3e3',
          200: '#f6e4c4',
          300: '#efd199',
          400: '#e4ba6b',
          500: '#d9a441',   // Eventure primary CTA
          600: '#bf9130',
          700: '#a67c1f',   // school site gold bar
          800: '#8a661a',
          900: '#6b4e0f',
        },
        // One hairline colour everywhere, so surfaces read as one system.
        hairline: '#e5e7eb',
        ink: '#0a1e43',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Hierarchy comes from type, not from container size, so the scale is
      // explicit rather than inherited from Tailwind's defaults.
      fontSize: {
        caption: ['13px', { lineHeight: '18px' }],
        body:    ['15px', { lineHeight: '22px' }],
        section: ['20px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        display: ['36px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
      },
      spacing: {
        // 8px rhythm, with the half-step available for dense rows
        4.5: '1.125rem',
        13:  '3.25rem',
      },
      maxWidth: {
        content: '1120px',
      },
      boxShadow: {
        // Architectural, not decorative. The border does the work; the shadow
        // only lifts a surface off the page by a hair.
        card:      '0 1px 2px 0 rgb(10 30 67 / 0.04)',
        'card-md': '0 2px 6px -1px rgb(10 30 67 / 0.06)',
        'card-lg': '0 8px 24px -8px rgb(10 30 67 / 0.10)',
      },
      borderRadius: {
        card: '14px',
        control: '10px',
        button: '12px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        // Standard material-style ease. No overshoot, no spring.
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in':  'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
