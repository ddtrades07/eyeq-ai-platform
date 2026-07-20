/**
 * Calm, abstract connection diagram, no dashboard mockups or stock medical imagery.
 */
export function ConnectionVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Illustration showing patient, care team, appointments, imaging, and follow-up connected in one circle of care"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="landingGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B8A8A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C4A882" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="480" height="360" rx="24" fill="url(#landingGlow)" />
      {/* soft orbit */}
      <circle cx="240" cy="180" r="120" stroke="#5B8A8A" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="6 8" />
      <circle cx="240" cy="180" r="78" stroke="#2C3E50" strokeOpacity="0.12" strokeWidth="1" />
      {/* center, connected care */}
      <circle cx="240" cy="180" r="36" fill="#2C3E50" fillOpacity="0.06" stroke="#2C3E50" strokeOpacity="0.2" />
      <text x="240" y="176" textAnchor="middle" fill="#2C3E50" fillOpacity="0.7" fontSize="11" fontFamily="system-ui,sans-serif">
        Connected
      </text>
      <text x="240" y="192" textAnchor="middle" fill="#2C3E50" fillOpacity="0.7" fontSize="11" fontFamily="system-ui,sans-serif">
        care
      </text>
      {/* nodes */}
      {[
        { x: 240, y: 52, label: 'Patient', color: '#C4A882' },
        { x: 388, y: 120, label: 'Appointments', color: '#5B8A8A' },
        { x: 352, y: 268, label: 'Imaging', color: '#6B8CAE' },
        { x: 128, y: 268, label: 'Follow-up', color: '#8BA888' },
        { x: 92, y: 120, label: 'Care team', color: '#7A8B99' },
        { x: 240, y: 308, label: 'Prescriptions', color: '#A8927A' },
      ].map((node) => (
        <g key={node.label}>
          <line x1="240" y1="180" x2={node.x} y2={node.y} stroke={node.color} strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx={node.x} cy={node.y} r="28" fill="white" fillOpacity="0.9" stroke={node.color} strokeOpacity="0.5" strokeWidth="1.5" />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fill="#2C3E50"
            fillOpacity="0.75"
            fontSize="10"
            fontFamily="system-ui,sans-serif"
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
