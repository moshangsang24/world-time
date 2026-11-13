/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          // 与 Tailwind 的 blue 色板一致；50 保留原值
          50: '#f0f9ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        space: {
          dark: '#090a0f',
          blue: '#1b2735',
          light: '#2d3748',
        },
        sun: {
          yellow: '#ffd700',
          orange: '#ff8c00',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['Monaco', 'Menlo', 'monospace'],
      },
      animation: {
        'rotate-slow': 'rotate 60s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}