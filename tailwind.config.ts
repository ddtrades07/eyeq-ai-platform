import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#bcdfff',
          300: '#8ecbff',
          400: '#58aeff',
          500: '#3290ff',
          600: '#1c72f0',
          700: '#1659d8',
          800: '#194aae',
          900: '#1a4189',
        },
        landing: {
          bg: '#faf8f4',
          navy: '#2c3e50',
          teal: '#5b8a8a',
          sand: '#e8dfd0',
          muted: '#5c6b7a',
          border: '#ddd5c8',
        },
        lens: {
          aqua: 'hsl(var(--lens-aqua))',
          teal: 'hsl(var(--lens-teal))',
          navy: 'hsl(var(--lens-navy))',
          violet: 'hsl(var(--lens-violet))',
          success: 'hsl(var(--lens-success))',
          warning: 'hsl(var(--lens-warning))',
          urgent: 'hsl(var(--lens-urgent))',
        },
      },
      fontFamily: {
        'landing-display': ['var(--font-landing-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        lens: '0 1px 0 hsl(var(--lens-highlight)) inset, 0 10px 28px -14px hsl(var(--lens-shadow))',
        'lens-hover':
          '0 1px 0 hsl(var(--lens-highlight)) inset, 0 14px 32px -12px hsl(var(--lens-shadow))',
      },
      transitionDuration: {
        lens: '180ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'lens-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'lens-shimmer': 'lens-shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
