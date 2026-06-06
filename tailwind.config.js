/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        steel: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        accent: {
          400: '#f6ad55',
          500: '#ed8936',
          600: '#dd6b20',
        },
        success: '#38a169',
        warning: '#d69e2e',
        danger: '#e53e3e',
        info: '#3182ce',
      },
    },
  },
  plugins: [],
}
