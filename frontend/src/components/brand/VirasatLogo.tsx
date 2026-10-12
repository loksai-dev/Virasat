import React from 'react';

export interface VirasatLogoProps {
  /** Size variant or numerical pixel dimension */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Presentation layout */
  variant?: 'emblem' | 'full' | 'compact' | 'horizontal';
  /** Color theme */
  theme?: 'dark' | 'light' | 'auto';
  /** Show the subtitle tagline */
  showTagline?: boolean;
  /** Custom extra CSS classes */
  className?: string;
  /** Optional onClick handler */
  onClick?: () => void;
}

/**
 * Virasat Custom Brand Identity Logo & Emblem
 * 
 * Motif:
 * - A refined geometric crest uniting a protective shield of trust with the
 *   interconnected boughs and roots of a generational Heritage Tree.
 * - Represents continuity, dignified asset transition, and deterministic legal safety.
 * - Works natively on dark navy and light warm-sand / white surfaces.
 */
export const VirasatLogo: React.FC<VirasatLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'auto',
  showTagline = true,
  className = '',
  onClick,
}) => {
  // Determine pixel sizes for emblem
  let emblemPx = 40;
  let wordmarkClass = 'text-xl';
  let badgeClass = 'text-[10px] px-1.5 py-0.5';
  let taglineClass = 'text-[11px]';

  if (typeof size === 'number') {
    emblemPx = size;
  } else {
    switch (size) {
      case 'sm':
        emblemPx = 28;
        wordmarkClass = 'text-base';
        badgeClass = 'text-[9px] px-1 py-0.2';
        taglineClass = 'text-[9px]';
        break;
      case 'md':
        emblemPx = 38;
        wordmarkClass = 'text-xl';
        badgeClass = 'text-[10px] px-1.5 py-0.5';
        taglineClass = 'text-[11px]';
        break;
      case 'lg':
        emblemPx = 48;
        wordmarkClass = 'text-2xl';
        badgeClass = 'text-xs px-2 py-0.5';
        taglineClass = 'text-xs';
        break;
      case 'xl':
        emblemPx = 64;
        wordmarkClass = 'text-3xl';
        badgeClass = 'text-xs px-2.5 py-1';
        taglineClass = 'text-sm';
        break;
    }
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-[#0B1F3A]';
  const taglineColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const badgeBg = isDark
    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
    : 'bg-teal-50 text-teal-800 border-teal-200';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none transition-opacity ${
        onClick ? 'cursor-pointer hover:opacity-95' : ''
      } ${className}`}
    >
      {/* 1. Standalone Geometric Emblem SVG */}
      <svg
        width={emblemPx}
        height={emblemPx}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
        aria-label="Virasat Emblem"
      >
        <defs>
          {/* Subtle Outer Protective Contour Gradient */}
          <linearGradient id="virasat-shield-grad" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B1F3A" />
            <stop offset="50%" stopColor="#133663" />
            <stop offset="100%" stopColor="#08182E" />
          </linearGradient>

          {/* Heritage Warm Gold Knot Gradient */}
          <linearGradient id="virasat-gold-grad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Continuity Teal Canopy Gradient */}
          <linearGradient id="virasat-teal-grad" x1="18" y1="8" x2="46" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>

          {/* Soft Highlight Glow */}
          <radialGradient id="virasat-center-glow" cx="32" cy="28" r="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0B1F3A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Protective Octagonal-Curved Shield Foundation */}
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="16"
          fill={isDark ? '#0D223F' : '#FAF8F5'}
          stroke={isDark ? 'url(#virasat-gold-grad)' : 'url(#virasat-shield-grad)'}
          strokeWidth="2.5"
        />

        {/* Subtle Ambient Depth Fill */}
        <rect x="5" y="5" width="54" height="54" rx="14" fill="url(#virasat-center-glow)" />

        {/* Protective Arch & Outer Canopy (Upper Vault) */}
        <path
          d="M17 26C17 17.716 23.716 11 32 11C40.284 11 47 17.716 47 26"
          stroke="url(#virasat-gold-grad)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Interlocking Tree of Heritage & Devolution Branches */}
        {/* Left Bough: Curves from trunk to left canopy knot */}
        <path
          d="M32 38C26 38 21 34 21 27C21 21.5 25 17 30 16"
          stroke="url(#virasat-teal-grad)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />

        {/* Right Bough: Symmetrical balance to right canopy knot */}
        <path
          d="M32 38C38 38 43 34 43 27C43 21.5 39 17 34 16"
          stroke="url(#virasat-teal-grad)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />

        {/* Central Rising Trunk of Continuity */}
        <path
          d="M32 50V25"
          stroke={isDark ? '#FFFFFF' : 'url(#virasat-shield-grad)'}
          strokeWidth="3.25"
          strokeLinecap="round"
        />

        {/* Crown Heritage Diamond / Seed Node */}
        <polygon
          points="32,15 36,20 32,25 28,20"
          fill="url(#virasat-gold-grad)"
        />

        {/* Dual Generational Nodes (Left & Right Heir Anchors) */}
        <circle cx="21" cy="27" r="3.25" fill="#14B8A6" />
        <circle cx="43" cy="27" r="3.25" fill="#14B8A6" />

        {/* Foundation Generational Root Keystone (Lower Interlock) */}
        <path
          d="M23 48C26.5 45.5 29.5 45 32 45C34.5 45 37.5 45.5 41 48"
          stroke="url(#virasat-gold-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="45" r="2.5" fill="url(#virasat-gold-grad)" />
      </svg>

      {/* 2. Wordmark + Brand Accents (rendered for 'full', 'compact', 'horizontal') */}
      {variant !== 'emblem' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className={`font-serif font-bold tracking-tight ${wordmarkClass} ${textColor}`}>
              Virasat
            </span>
            <span
              className={`font-sans font-semibold rounded-full border shrink-0 tracking-wide ${badgeClass} ${badgeBg}`}
            >
              AI Estate Care
            </span>
          </div>

          {showTagline && variant !== 'compact' && (
            <span className={`font-normal italic mt-0.5 ${taglineClass} ${taglineColor}`}>
              Every legacy, settled with care.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
