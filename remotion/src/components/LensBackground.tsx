import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export const LensBackground: React.FC<{ accent?: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 40], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${theme.bgFrom} 0%, ${theme.bgVia} 48%, ${theme.bgTo} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          top: -180 + drift * 0.3,
          right: -120,
          background: `radial-gradient(circle, ${accent ?? theme.aqua}33 0%, transparent 68%)`,
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 560,
          height: 560,
          borderRadius: '50%',
          bottom: -160,
          left: -100 - drift * 0.2,
          background: `radial-gradient(circle, ${theme.violet}22 0%, transparent 70%)`,
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.35,
        }}
      />
    </AbsoluteFill>
  );
};
