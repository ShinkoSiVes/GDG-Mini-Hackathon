/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FDFBF7',
          100: '#FAF8F5',
          200: '#F4F0E8',
          300: '#EDE7DC',
          400: '#D9D0C1',
        },
        ink: {
          DEFAULT: '#121316',
          muted: '#525866',
          light: '#8E95A5',
        },
        mango: {
          light: '#FFF9E6',
          DEFAULT: '#FFB800',
          hover: '#E5A500',
          dark: '#B88200',
        },
        terracotta: {
          light: '#FDEEE9',
          DEFAULT: '#E05D38',
        },
        sage: {
          light: '#EBF4F0',
          DEFAULT: '#3B7A68',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'monospace',
        ],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        'chunky': '0 4px 0 0 #121316',
        'chunky-sm': '0 2px 0 0 #121316',
        'chunky-hover': '0 6px 0 0 #121316',
        'chunky-active': '0 1px 0 0 #121316',
        'chunky-mango': '0 4px 0 0 #B88200',
      },
    },
  },
  plugins: [],
}
