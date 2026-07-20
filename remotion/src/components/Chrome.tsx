import React from 'react';
import { theme } from '../theme';

export const GlassPanel: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  ai?: boolean;
}> = ({ children, style, ai }) => (
  <div
    style={{
      background: ai ? 'rgba(245,242,255,0.94)' : theme.glassStrong,
      border: `1px solid ${ai ? 'rgba(123,108,240,0.28)' : theme.glassBorder}`,
      borderRadius: 16,
      boxShadow: theme.shadowSoft,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

export const AppChrome: React.FC<{
  title: string;
  children: React.ReactNode;
  nav?: string[];
  activeNav?: string;
  style?: React.CSSProperties;
}> = ({ title, children, nav = ['Dashboard', 'Schedule', 'Patients', 'Tasks'], activeNav, style }) => (
  <GlassPanel
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        borderBottom: `1px solid ${theme.glassBorder}`,
        background: theme.glassStrong,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${theme.aqua}, ${theme.primary})`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      />
      <div style={{ fontWeight: 700, color: theme.navy, fontSize: 16, letterSpacing: '-0.02em' }}>
        EyeQ
      </div>
      <div style={{ color: theme.navyMuted, fontSize: 14 }}>{title}</div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {nav.map((n) => (
          <div
            key={n}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 10px',
              borderRadius: 8,
              color: (activeNav ?? nav[0]) === n ? theme.primary : theme.navyMuted,
              background: (activeNav ?? nav[0]) === n ? 'rgba(27,111,191,0.1)' : 'transparent',
            }}
          >
            {n}
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: theme.white,
          background: theme.demoBadge,
          padding: '4px 8px',
          borderRadius: 999,
          letterSpacing: '0.04em',
        }}
      >
        DEMO
      </div>
    </div>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>{children}</div>
  </GlassPanel>
);

export const Sidebar: React.FC<{ items: string[]; active?: string }> = ({ items, active }) => (
  <div
    style={{
      width: 180,
      borderRight: `1px solid ${theme.glassBorder}`,
      padding: 14,
      background: 'rgba(255,255,255,0.45)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}
  >
    {items.map((item) => (
      <div
        key={item}
        style={{
          padding: '8px 10px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: active === item ? theme.navy : theme.navyMuted,
          background: active === item ? 'rgba(27,111,191,0.12)' : 'transparent',
        }}
      >
        {item}
      </div>
    ))}
  </div>
);

export const MetricCard: React.FC<{ label: string; value: string; tone?: string }> = ({
  label,
  value,
  tone = theme.primary,
}) => (
  <GlassPanel style={{ padding: 14, flex: 1 }}>
    <div style={{ fontSize: 12, color: theme.navyMuted, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: tone, marginTop: 4 }}>{value}</div>
  </GlassPanel>
);

export const SoftRow: React.FC<{ left: string; right: string; badge?: string }> = ({
  left,
  right,
  badge,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderBottom: `1px solid ${theme.glassBorder}`,
      fontSize: 13,
      color: theme.navy,
    }}
  >
    <span>{left}</span>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {badge ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: theme.teal,
            background: 'rgba(42,155,143,0.12)',
            padding: '3px 8px',
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      ) : null}
      <span style={{ color: theme.navyMuted }}>{right}</span>
    </div>
  </div>
);
