/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0f4ff', 100: '#e0e9ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#1e1b4b' },
        surface: { DEFAULT: '#0f0f1a', card: '#161625', border: '#1e1e35', hover: '#1a1a2e' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'flow': 'flow 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        flow: { '0%, 100%': { opacity: 0.4 }, '50%': { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
