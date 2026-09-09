/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        surface: '#0d0d0d',
        'surface-hover': '#171614',
        card: '#10100f',
        border: '#2b2a27',
        accent: {
          pink: '#cbb88a',
          purple: '#d8c79e',
          cyan: '#b9b6ad',
          emerald: '#10b981',
          gold: '#cbb88a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(203,184,138,.11), transparent 70%)',
        'card-glow': 'radial-gradient(circle at top right, rgba(203,184,138,.08), transparent 70%)',
        'cyan-glow': 'radial-gradient(circle at bottom left, rgba(255,255,255,.06), transparent 70%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
};
