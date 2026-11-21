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
          50: '#fffbf3',
          100: '#fdf0d5', // Palette stripe 5: Warm Cream / Paper Ivory
          200: '#f6e2b8',
          300: '#edd095',
          400: '#d9b672',
        },
        ink: {
          DEFAULT: '#183642', // Palette stripe 4: Deep Petrol Ink
          muted: '#3b5b68',
          light: '#658290',
        },
        mango: {
          light: '#fef7d8',
          DEFAULT: '#fcdc4d', // Palette stripe 1: Golden Mango Yellow
          hover: '#f5d136',
          dark: '#c9a518',
        },
        slate: {
          light: '#47577d',
          DEFAULT: '#313d5a', // Palette stripe 2: Rich Slate Navy
          dark: '#222b40',
        },
        coral: {
          light: '#fde8e7',
          DEFAULT: '#f0544f', // Palette stripe 3: Vibrant Coral Red
          hover: '#de433e',
          dark: '#b8322e',
        },
        terracotta: {
          light: '#fde8e7',
          DEFAULT: '#f0544f', // Aliased for backward compatibility
          hover: '#de433e',
          dark: '#b8322e',
        },
        sage: {
          light: '#e6f3ee',
          DEFAULT: '#2a7b62',
        },
      },
      fontFamily: {
        display: [
          'Bricolage Grotesque',
          'Plus Jakarta Sans',
          'sans-serif',
        ],
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
        'chunky': '0 4px 0 0 #183642',
        'chunky-sm': '0 2px 0 0 #183642',
        'chunky-hover': '0 6px 0 0 #183642',
        'chunky-active': '0 1px 0 0 #183642',
        'chunky-mango': '0 4px 0 0 #c9a518',
        'chunky-slate': '0 4px 0 0 #313d5a',
        'chunky-coral': '0 4px 0 0 #b8322e',
      },
    },
  },
  plugins: [],
}
