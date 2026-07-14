import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover:   '#1D4ED8',
          light:   '#EFF6FF',
        },
        secondary: '#3B82F6',
        cta: {
          DEFAULT: '#2563EB',
          hover:   '#1D4ED8',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light:   '#FFFBEB',
        },
        danger: {
          DEFAULT: '#DC2626',
          light:   '#FEF2F2',
        },
        success: {
          DEFAULT: '#10B981',
          light:   '#ECFDF5',
        },
        info: {
          DEFAULT: '#3B82F6',
          light:   '#EFF6FF',
        },
        background: '#F5F7F9',
        surface: {
          DEFAULT: '#FFFFFF',
          raised:  '#F9FAFB',
        },
        text: {
          DEFAULT: '#111827',
          muted:   '#6B7280',
          subtle:  '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong:  '#D1D5DB',
        },
      },
      fontFamily: {
        sans: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        elevation1: 'var(--elevation-1)',
        elevation2: 'var(--elevation-2)',
        elevation3: 'var(--elevation-3)',
        elevation4: 'var(--elevation-4)',
        elevation5: 'var(--elevation-5)',
      },
      backdropBlur: {
        glass: '16px',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        fast:    '150ms',
        slow:    '300ms',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      height: {
        topbar: 'var(--topbar-height)',
      },
    },
  },
  plugins: [],
};

export default config;
