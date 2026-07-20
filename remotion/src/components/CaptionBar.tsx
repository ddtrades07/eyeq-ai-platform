import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const CaptionBar: React.FC<{
  title: string;
  caption: string;
  subtitle?: string;
  delay?: number;
}> = ({ title, caption, subtitle, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [28, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 48,
        opacity,
        transform: `translateY(${y}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: theme.fontSans,
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          background: theme.captionBg,
          color: theme.white,
          borderRadius: 16,
          padding: '18px 24px',
          maxWidth: 1100,
          boxShadow: theme.shadow,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: subtitle || caption ? 6 : 0,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>
            {subtitle}
          </div>
        ) : null}
        {caption ? (
          <div
            style={{
              marginTop: subtitle ? 8 : 0,
              fontSize: 18,
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.4,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
      <div
        style={{
          alignSelf: 'flex-start',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: theme.navyMuted,
          background: 'rgba(255,255,255,0.7)',
          border: `1px solid ${theme.glassBorder}`,
          borderRadius: 999,
          padding: '6px 12px',
        }}
      >
        Demo data only · No live PHI
      </div>
    </div>
  );
};
