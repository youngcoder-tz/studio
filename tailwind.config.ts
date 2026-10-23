import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        panel: 'var(--color-panel)',
        panel2: 'var(--color-panel-2)',
        ink: 'var(--color-ink)',
        'ink-dim': 'var(--color-ink-dim)',
        'ink-faint': 'var(--color-ink-faint)',
        line: 'var(--color-line)',
        accent: 'var(--color-accent)',
        'accent-glow': 'var(--color-accent-glow)',
        success: 'var(--color-success)',
        warn: 'var(--color-warn)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      boxShadow: {
        'glow-accent': '0 0 0 1px color-mix(in oklab, var(--color-accent) 40%, transparent), 0 10px 60px -20px var(--color-accent-glow)',
        'glass': '0 10px 40px -20px rgba(0,0,0,0.6), inset 0 1px 0 color-mix(in oklab, white 6%, transparent)',
        'glass-light': '0 20px 60px -30px rgba(15,23,42,0.8), inset 0 1px 0 color-mix(in oklab, white 70%, transparent)',
      },
      backdropBlur: {
        xs: '6px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s ease-in-out infinite',
        fadeIn: 'fadeIn 220ms cubic-bezier(0.16,1,0.3,1)',
        scaleIn: 'scaleIn 200ms cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};

export default config;
