import React from 'react';
import Image from 'next/image';

interface RwayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  variant?: 'horizontal' | 'full' | 'icon';
  className?: string;
}

export const RwayLogo: React.FC<RwayLogoProps> = ({
  size = 'md',
  showText = true,
  textColor,
  variant = 'horizontal',
  className = '',
}) => {
  const dimensions = {
    sm: { iconHeight: 28, fullHeight: 48, fontSize: '1.05rem', subSize: '0.45rem' },
    md: { iconHeight: 38, fullHeight: 64, fontSize: '1.35rem', subSize: '0.55rem' },
    lg: { iconHeight: 52, fullHeight: 90, fontSize: '1.85rem', subSize: '0.72rem' },
    xl: { iconHeight: 68, fullHeight: 120, fontSize: '2.4rem', subSize: '0.88rem' },
  }[size];

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/images/rway-logo.png"
          alt="RWAY Promotion Partners"
          style={{
            height: `${dimensions.fullHeight}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}
    >
      <img
        src="/images/rway-icon.png"
        alt="RWAY"
        style={{
          height: `${dimensions.iconHeight}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: dimensions.fontSize,
              color: textColor || '#173D3E',
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
              color: '#C98A2C',
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

