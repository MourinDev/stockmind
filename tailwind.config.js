/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chumbo: '#334155',
        royal: { DEFAULT: '#1E3A8A', claro: '#1D4ED8' },
        teal: { marca: '#0D9488' },
      },
      fontFamily: { sans: ['Montserrat', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
