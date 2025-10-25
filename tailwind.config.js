/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f8fafc',
        card: '#ffffff',
        primary: '#0ea5e9',
        soft: '#e2e8f0',
        text: '#0f172a',
      },
      boxShadow: {
        soft: '0 10px 25px -10px rgba(15, 23, 42, 0.15)'
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'Arial', 'sans-serif']
      }
    },
  },
  plugins: [],
}
