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
        background: '#09090b',
        surface: '#121217',
        'surface-hover': '#1a1a23',
        card: '#16161f',
        border: '#272738',
        accent: {
          pink: '#ec4899',
          purple: '#a855f7',
          cyan: '#06b6d4',
          emerald: '#10b981',
          gold: '#eab308'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.15), rgba(9, 9, 11, 1))',
        'card-glow': 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.15), transparent 70%)',
        'cyan-glow': 'radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.15), transparent 70%)',
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
