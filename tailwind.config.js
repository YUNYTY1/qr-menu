/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Playfair Display"', 'Georgia', 'serif'] },
      colors: {
        cream: '#fff7ef',
        accent: '#f25c26',
        brand: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
          500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        scan: { '0%,100%': { top: '8%' }, '50%': { top: '75%' } },
        toast: {
          '0%,12%': { opacity: '0', transform: 'translateY(14px) scale(.96)' },
          '20%,85%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '94%,100%': { opacity: '0', transform: 'translateY(-6px) scale(.98)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        scan: 'scan 3.6s ease-in-out infinite',
        toast: 'toast 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}