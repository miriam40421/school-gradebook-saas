import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          hover:   '#4F46E5',
          light:   '#EEF2FF',
        },
        secondary: '#818CF8',
        cta: {
          DEFAULT: '#10B981',
          hover:   '#059669',
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
        background: '#F5F3FF',
        surface: {
          DEFAULT: '#FFFFFF',
          raised:  '#FAFAFA',
        },
        text: {
          DEFAULT: '#1E1B4B',
          muted:   '#475569',
          subtle:  '#94A3B8',
        },
        border: {
          DEFAULT: 'rgba(99,102,241,0.15)',
          strong:  'rgba(99,102,241,0.30)',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-hebrew)', 'system-ui', 'sans-serif'],
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
