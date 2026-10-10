/**
 * Virasat Design System Tokens
 * "Every legacy, settled with care."
 */

export const tokens = {
  colors: {
    primary: {
      DEFAULT: '#0B1F3A', // Primary Navy
      hover: '#132B4F',
      light: '#1B3B66',
      dark: '#061325',
      surface: '#0F294C',
    },
    accent: {
      teal: {
        DEFAULT: '#14B8A6', // Accent Teal
        hover: '#0D9488',
        light: '#CCFBF1',
        soft: 'rgba(20, 184, 166, 0.12)',
        glow: 'rgba(20, 184, 166, 0.25)',
      },
      gold: {
        DEFAULT: '#C9A227', // Legacy Gold
        hover: '#B38E1F',
        light: '#FEF9C3',
        soft: 'rgba(201, 162, 39, 0.12)',
        glow: 'rgba(201, 162, 39, 0.25)',
      },
    },
    background: {
      sand: '#F7F5F0', // Warm Sand
      white: '#FFFFFF', // Cards White
      subtle: '#F1EFEA',
      cardHover: '#FAF9F6',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#334155', // Slate 700
      muted: '#64748B', // Slate 500
      subtle: '#94A3B8', // Slate 400
      inverse: '#F8FAFC',
    },
    border: {
      DEFAULT: '#E5E7EB',
      light: '#F3F4F6',
      subtle: '#E2E8F0',
      focus: '#14B8A6',
    },
    status: {
      success: {
        DEFAULT: '#16A34A',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        text: '#15803D',
      },
      warning: {
        DEFAULT: '#F59E0B',
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#B45309',
      },
      risk: {
        DEFAULT: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#B91C1C',
      },
      info: {
        DEFAULT: '#3B82F6',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1D4ED8',
      },
    },
  },
  fonts: {
    serif: ['Fraunces', 'Georgia', 'serif'],
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  },
  fontSize: {
    h1: ['44px', { lineHeight: '1.2', fontWeight: '600' }],
    h2: ['32px', { lineHeight: '1.25', fontWeight: '600' }],
    h3: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
    bodyLarge: ['18px', { lineHeight: '1.5', fontWeight: '400' }],
    body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
    caption: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
    tiny: ['11px', { lineHeight: '1.3', fontWeight: '500' }],
  },
  borderRadius: {
    card: '16px',
    pill: '9999px',
    button: '12px',
    tag: '8px',
  },
  shadows: {
    soft: '0 4px 20px -2px rgba(11, 31, 58, 0.05), 0 2px 6px -1px rgba(11, 31, 58, 0.03)',
    elevated: '0 12px 32px -4px rgba(11, 31, 58, 0.08), 0 4px 12px -2px rgba(11, 31, 58, 0.04)',
    glowTeal: '0 0 24px -2px rgba(20, 184, 166, 0.3)',
    glowGold: '0 0 24px -2px rgba(201, 162, 39, 0.3)',
  },
} as const;

export type DesignTokens = typeof tokens;
