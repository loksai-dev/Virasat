/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3A',
          hover: '#132B4F',
          light: '#1B3B66',
          dark: '#061325',
          surface: '#0F294C',
          text: '#0F172A',
        },
        teal: {
          accent: '#14B8A6',
          hover: '#0D9488',
          light: '#CCFBF1',
          soft: 'rgba(20, 184, 166, 0.12)',
        },
        gold: {
          DEFAULT: '#C9A227',
          hover: '#B38E1F',
          light: '#FEF9C3',
          soft: 'rgba(201, 162, 39, 0.12)',
        },
        warm: {
          sand: '#F7F5F0',
          subtle: '#F1EFEA',
        },
        muted: {
          text: '#64748B',
          subtle: '#94A3B8',
        },
        virasat: {
          success: '#16A34A',
          warning: '#F59E0B',
          risk: '#DC2626',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'h1': ['44px', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['32px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        'body': ['16px', { lineHeight: '1.5' }],
        'caption': ['13px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'virasat': '16px',
        'virasat-card': '16px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(11, 31, 58, 0.05), 0 2px 6px -1px rgba(11, 31, 58, 0.03)',
        'elevated': '0 12px 32px -4px rgba(11, 31, 58, 0.08), 0 4px 12px -2px rgba(11, 31, 58, 0.04)',
        'glow-teal': '0 0 24px -2px rgba(20, 184, 166, 0.3)',
        'glow-gold': '0 0 24px -2px rgba(201, 162, 39, 0.3)',
      }
    },
  },
  plugins: [],
}
