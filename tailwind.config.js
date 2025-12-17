/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-main) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        'card-alt': 'rgb(var(--bg-card-alt) / <alpha-value>)',
        
        text: 'rgb(var(--text-main) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        
        border: 'rgb(var(--border-soft) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--primary-foreground) / <alpha-value>)',
        
        // Neon Accents
        'accent-sky': 'rgb(var(--accent-sky) / <alpha-value>)',
        'accent-blue': 'rgb(var(--accent-blue) / <alpha-value>)',
        'accent-amber': 'rgb(var(--accent-amber) / <alpha-value>)',
        'accent-rose': 'rgb(var(--accent-rose) / <alpha-value>)',
        'accent-indigo': 'rgb(var(--accent-indigo) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 10px 25px -10px rgba(0, 0, 0, 0.1)',
        neon: '0 0 5px theme("colors.primary"), 0 0 20px theme("colors.primary")',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'Arial', 'sans-serif']
      }
    },
  },
  plugins: [],
}
