/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'var(--ink-900)',
          600: 'var(--ink-600)',
          400: 'var(--ink-400)',
        },
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        hairline: 'var(--hairline)',
        rzp: {
          blue: 'var(--rzp-blue)',
          deep: 'var(--rzp-blue-deep)',
          wash: 'var(--rzp-blue-wash)',
        },
        driver: {
          perf: 'var(--driver-perf)',
          service: 'var(--driver-service)',
          commercial: 'var(--driver-commercial)',
          disengaged: 'var(--driver-disengaged)',
        },
        cliff: 'var(--cliff)',
        ok: 'var(--ok)',
        lock: 'var(--lock)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        floating: '0 1px 2px rgba(11,27,58,.06), 0 4px 16px rgba(11,27,58,.04)',
      },
      borderRadius: {
        panel: '10px',
        chip: '6px',
      },
    },
  },
  plugins: [],
};
