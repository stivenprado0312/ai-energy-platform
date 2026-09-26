/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        severity: {
          high: '#dc2626',
          medium: '#d97706',
          low: '#475569',
        },
        type: {
          real: '#dc2626',
          explainable: '#2563eb',
          falsepos: '#64748b',
          dataquality: '#d97706',
          normal: '#94a3b8',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          border: '#e2e8f0',
        },
        ink: {
          DEFAULT: '#0f172a',
          muted: '#475569',
          subtle: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
