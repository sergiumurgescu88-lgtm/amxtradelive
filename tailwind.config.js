/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.6' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg': ['18px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
      },
      lineHeight: {
        'body': '1.6',
        'heading': '1.2',
        'tight': '1.1',
      },
      letterSpacing: {
        'normal': '0em',
        'mobile-track': '0.01em',
        'desktop-track': '0.03em',
      },
      fontWeight: {
        regular: '400',
        semibold: '600',
        extrabold: '800',
      },
      colors: {
        slate: {
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
        },
        success: '#10b981', // emerald-500
        error: '#f43f5e',   // rose-500
        warning: '#f59e0b', // amber-500
        info: '#06b6d4',    // cyan-500
      },
    },
  },
  plugins: [],
};
