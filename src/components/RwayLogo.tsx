import React from 'react';

interface RwayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export const RwayLogo: React.FC<RwayLogoProps> = ({
  size = 'md',
  showText = true,
  textColor,
  className = '',
}) => {
  const dimensions = {
    sm: { iconWidth: 38, iconHeight: 32, fontSize: '1rem', subSize: '0.45rem' },
    md: { iconWidth: 52, iconHeight: 44, fontSize: '1.4rem', subSize: '0.55rem' },
    lg: { iconWidth: 70, iconHeight: 58, fontSize: '1.9rem', subSize: '0.72rem' },
    xl: { iconWidth: 96, iconHeight: 80, fontSize: '2.5rem', subSize: '0.9rem' },
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
    >
      <svg
        width={dimensions.iconWidth}
        height={dimensions.iconHeight}
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="rwayTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B4D4F" />
            <stop offset="50%" stopColor="#226A66" />
            <stop offset="100%" stopColor="#133C3B" />
          </linearGradient>

          <linearGradient id="rwayGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5B942" />
            <stop offset="60%" stopColor="#D89223" />
            <stop offset="100%" stopColor="#B07014" />
          </linearGradient>

          <linearGradient id="rwayLightTeal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#439A86" />
            <stop offset="100%" stopColor="#1F5D59" />
          </linearGradient>

          <filter id="rwayShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#0d2827" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Dynamic Curved Ribbon 'R' & 'W' */}
        {/* Left top hook of R */}
        <path
          d="M 12 28 C 12 20 28 18 45 18 C 58 18 64 24 64 34 C 64 42 56 46 44 48 C 34 50 25 50 20 54 C 14 59 14 68 18 78 C 21 85 28 88 34 88 C 42 88 48 82 50 74 L 56 50 C 58 40 66 32 78 32 C 86 32 92 38 92 46"
          stroke="url(#rwayTealGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rwayShadow)"
        />

        {/* Inner Gold Swirl & Accents */}
        <path
          d="M 18 42 C 22 34 30 30 42 30 C 52 30 58 35 56 42 C 54 48 46 52 36 56 C 26 60 22 66 24 74 C 26 80 32 84 38 84 C 44 84 48 79 50 73"
          stroke="url(#rwayGoldGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The 'W' Wave and Arrow Upward */}
        <path
          d="M 50 50 C 56 66 64 78 72 78 C 80 78 86 64 92 46 L 100 24"
          stroke="url(#rwayTealGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gold highlight along the W right wing */}
        <path
          d="M 66 68 C 72 74 76 74 82 66 L 96 32"
          stroke="url(#rwayGoldGrad)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Upward Growth Arrow Head */}
        <path
          d="M 88 20 L 108 14 L 104 34 Z"
          fill="url(#rwayGoldGrad)"
        />
        <path
          d="M 92 18 L 108 14 L 100 26 Z"
          fill="url(#rwayLightTeal)"
        />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: dimensions.fontSize,
              color: textColor || '#133D3C',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-heading, "Plus Jakarta Sans", "Inter", sans-serif)',
            }}
          >
            RWAY
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: dimensions.subSize,
              color: '#C88D25',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: '3px',
              fontFamily: 'var(--font-heading, "Inter", sans-serif)',
            }}
          >
            PROMOTION PARTNERS
          </span>
        </div>
      )}
    </div>
  );
};
