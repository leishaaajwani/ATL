/** @type {import('tailwindcss').Config} */

// Palette derived from GEMS Modern Academy brand assets:
//   * School site header navy   #0A1E43  -> navy.900
//   * School site gold bar      #A67C1F  -> gold.700
//   * Modern Eventure cards     #123A8A  -> navy.700
//   * Modern Eventure CTA gold  #D9A441  -> gold.500
// Navy carries structure (headers, nav, text). Gold carries action (primary
// buttons, active tab states). Green is reserved for confirmed/approved only.

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
        // Semantic aliases so components stop hardcoding hex values
        ink:     '#0a1e43',
        parchment: '#fdfdfb',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 2px 0 rgb(10 30 67 / 0.05)',
        'card-md': '0 4px 12px -2px rgb(10 30 67 / 0.08)',
        'card-lg': '0 12px 32px -8px rgb(10 30 67 / 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
