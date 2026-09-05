/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Dark-minimal theme (Sep 2026): the app was written against Tailwind's
      // light palette, so instead of rewriting hundreds of class names, the
      // named colors are remapped to their dark-theme equivalents. Reading
      // guide: 'white' = raised surface, gray 50-300 = surfaces/borders
      // (darker than text), gray 400-900 = text (lighter as the number grows),
      // so bg-gray-900 + text-white still yields the inverted primary button.
      colors: {
        white: '#191f24',
        gray: {
          50: '#202830',
          100: '#232b32',
          200: '#262e35',
          300: '#2b343d',
          400: '#707c88',
          500: '#8a94a0',
          600: '#9aa4ad',
          700: '#c2c9d0',
          800: '#d5dade',
          900: '#e7e9ea',
        },
        red: {
          50: '#2a191c',
          200: '#4a2528',
          600: '#f08a8a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
