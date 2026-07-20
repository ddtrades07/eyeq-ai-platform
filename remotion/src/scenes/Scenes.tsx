import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { theme } from '../theme';
import { LensBackground } from '../components/LensBackground';
import { CaptionBar } from '../components/CaptionBar';
import {
  AppChrome,
  GlassPanel,
  MetricCard,
  Sidebar,
  SoftRow,
} from '../components/Chrome';
import { ScreenshotOrMock } from '../components/ScreenshotOrMock';

const floatIn = (frame: number, fps: number, delay = 0) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 90 } });
  return {
    opacity: s,
    transform: `translateY(${interpolate(s, [0, 1], [36, 0])}px) scale(${interpolate(s, [0, 1], [0.97, 1])})`,
  };
};

const Frame: React.FC<{
  children: React.ReactNode;
  accent?: string;
  delay?: number;
}> = ({ children, accent, delay = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panel = floatIn(frame, fps, delay);
  return (
    <AbsoluteFill>
      <LensBackground accent={accent} />
      <AbsoluteFill style={{ padding: '48px 64px 190px', fontFamily: theme.fontSans }}>
        <div style={{ ...panel, height: '100%' }}>{children}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = floatIn(frame, fps, 4);

  return (
    <AbsoluteFill>
      <LensBackground accent={theme.aqua} />
      <AbsoluteFill style={{ padding: '48px 64px 190px', fontFamily: theme.fontSans }}>
        <div style={{ ...logo, height: '100%' }}>
          <ScreenshotOrMock shot="hero" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    margin: '0 auto 24px',
                    borderRadius: 24,
                    background: `linear-gradient(145deg, ${theme.aqua}, ${theme.primary} 55%, ${theme.violet})`,
                    boxShadow: theme.shadow,
                  }}
                />
                <div style={{ fontSize: 92, fontWeight: 750, color: theme.navy, letterSpacing: '-0.04em' }}>
                  EyeQ
                </div>
                <div style={{ marginTop: 14, fontSize: 26, color: theme.navyMuted, maxWidth: 820 }}>
                  A modern optometry operating system for private practices.
                </div>
              </div>
            </div>
          </ScreenshotOrMock>
        </div>
      </AbsoluteFill>
      <CaptionBar
        title="EyeQ"
        subtitle="A modern optometry operating system for private practices."
        caption="One connected platform for clinical care, operations, and patient communication."
      />
    </AbsoluteFill>
  );
};

export const ScenePlatform: React.FC = () => (
  <>
    <Frame>
      <ScreenshotOrMock shot="dashboard" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Practice dashboard" activeNav="Dashboard">
          <Sidebar items={['Today', 'Schedule', 'Patients', 'Staff tasks']} active="Today" />
          <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <MetricCard label="Checked in" value="12" />
              <MetricCard label="In exam" value="4" tone={theme.aqua} />
              <MetricCard label="Staff tasks" value="7" tone={theme.warning} />
              <MetricCard label="Care gaps" value="3" tone={theme.violet} />
            </div>
            <GlassPanel style={{ flex: 1 }}>
              <div style={{ padding: '12px 14px', fontWeight: 700 }}>Today&apos;s schedule</div>
              <SoftRow left="Jordan Lee · Comprehensive" right="9:00 AM" badge="Arrived" />
              <SoftRow left="Sam Rivera · CL follow-up" right="9:30 AM" badge="In chair" />
              <SoftRow left="Alex Kim · Annual" right="10:00 AM" badge="Confirmed" />
            </GlassPanel>
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Practice operations in one place"
      caption="Dashboard, scheduling, check-in, and staff tasks keep the front office moving."
    />
  </>
);

export const SceneClinical: React.FC = () => (
  <>
    <Frame accent={theme.primary}>
      <ScreenshotOrMock shot="patient-chart" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Patient chart · Jordan Lee (demo)" activeNav="Patients">
          <div style={{ flex: 1, padding: 16, display: 'flex', gap: 12 }}>
            <GlassPanel style={{ width: 240, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Jordan Lee</div>
              <div style={{ color: theme.navyMuted, fontSize: 13, marginTop: 4 }}>Demo patient</div>
              {['Overview', 'Appointments', 'Notes', 'Exam', 'Imaging'].map((t, i) => (
                <div
                  key={t}
                  style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: i === 0 ? 'rgba(27,111,191,0.12)' : 'transparent',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {t}
                </div>
              ))}
            </GlassPanel>
            <GlassPanel style={{ flex: 1, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>SOAP note · Draft</strong>
                <span style={{ color: theme.warning, fontWeight: 700, fontSize: 12 }}>Needs sign-off</span>
              </div>
              <div style={{ marginTop: 12, color: theme.navyMuted, fontSize: 14, lineHeight: 1.5 }}>
                S: Near blur after screens. O: Demo findings recorded. A: Presbyopia (demo). P: Progressive
                options discussed.
              </div>
            </GlassPanel>
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Patient chart and clinical workflow"
      caption="History, encounters, SOAP drafts, and provider sign-off in one chart."
    />
  </>
);

export const SceneImaging: React.FC = () => (
  <>
    <Frame accent={theme.teal}>
      <ScreenshotOrMock shot="imaging-review" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Imaging review · Demo OCT">
          <div style={{ flex: 1, padding: 16, display: 'flex', gap: 12 }}>
            {['OD', 'OS', 'Compare'].map((label) => (
              <GlassPanel
                key={label}
                style={{
                  flex: 1,
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 16,
                  background: `linear-gradient(160deg, #d9e6f2, #eef4fa)`,
                  fontWeight: 700,
                }}
              >
                {label}
              </GlassPanel>
            ))}
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Imaging connected to the chart"
      caption="Upload, compare, and provider review stay tied to the patient record."
    />
  </>
);

export const SceneRxOptical: React.FC = () => (
  <>
    <Frame accent={theme.aqua}>
      <ScreenshotOrMock shot="rx-optical" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Prescriptions & optical">
          <div style={{ flex: 1, padding: 16, display: 'flex', gap: 12 }}>
            <GlassPanel style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>Glasses Rx · Draft</div>
              <SoftRow left="OD / OS demo values" right="Unsigned" badge="Draft" />
              <SoftRow left="Provider sign-off" right="Required" />
            </GlassPanel>
            <GlassPanel style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>Optical order</div>
              <SoftRow left="Progressive lenses" right="Queued" badge="Order" />
              <SoftRow left="Dispensary status" right="In progress" />
            </GlassPanel>
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Prescriptions and optical orders"
      caption="Glasses and contact lens Rx with draft, sign-off, and optical order workflow."
    />
  </>
);

export const SceneAI: React.FC = () => (
  <>
    <Frame accent={theme.violet}>
      <ScreenshotOrMock shot="ai-copilot" style={{ width: '100%', height: '100%' }}>
        <div style={{ height: '100%', display: 'flex', gap: 14 }}>
          <GlassPanel ai style={{ flex: 1, padding: 18 }}>
            <div style={{ fontWeight: 700, color: theme.violet }}>Ask EyeQ</div>
            <div style={{ marginTop: 10, fontSize: 15 }}>Draft a patient portal message summary.</div>
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.75)',
                color: theme.navyMuted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Draft only: Thanks for coming in today. We reviewed your near vision concerns.
              <div style={{ marginTop: 10, fontWeight: 700, color: theme.violet }}>
                Requires provider review
              </div>
            </div>
          </GlassPanel>
          <GlassPanel ai style={{ flex: 1, padding: 18 }}>
            <div style={{ fontWeight: 700, color: theme.violet }}>Clinical assist</div>
            <SoftRow left="Pre-chart summary" right="Draft" badge="Review" />
            <SoftRow left="SOAP structure" right="Draft" badge="Review" />
            <SoftRow left="Ambient scribe session" right="Ready" badge="Review" />
          </GlassPanel>
        </div>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="AI that supports the provider"
      caption="Ask EyeQ, pre-charting, SOAP drafts, and message drafts. Always review before clinical use."
    />
  </>
);

export const ScenePortal: React.FC = () => (
  <>
    <Frame>
      <ScreenshotOrMock shot="patient-portal" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Patient portal · Demo" nav={['Home', 'Visits', 'Rx', 'Messages']} activeNav="Home">
          <div style={{ flex: 1, padding: 18, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Welcome back</div>
              <SoftRow left="Upcoming exam" right="Tue 9:00 AM" />
              <SoftRow left="Glasses Rx" right="View" badge="New" />
              <SoftRow left="Secure message" right="Open" />
            </GlassPanel>
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontWeight: 700 }}>Reminder preview</div>
              <div style={{ marginTop: 10, fontSize: 13, color: theme.navyMuted, lineHeight: 1.45 }}>
                Consent-aware reminder draft. SMS and email send only with vendor, BAA, and patient consent.
              </div>
            </GlassPanel>
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Patient portal and reminders"
      caption="Visits, Rx, secure messages, and consent-aware reminder previews."
    />
  </>
);

export const SceneBusiness: React.FC = () => (
  <>
    <Frame accent={theme.primary}>
      <ScreenshotOrMock shot="business" style={{ width: '100%', height: '100%' }}>
        <AppChrome title="Billing · Care gaps · Reputation">
          <div style={{ flex: 1, padding: 16, display: 'flex', gap: 12 }}>
            <GlassPanel style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>Invoice draft</div>
              <SoftRow left="Comprehensive exam" right="$180" badge="Draft" />
              <SoftRow left="Claim validation" right="Ready" />
            </GlassPanel>
            <GlassPanel style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>Care gaps</div>
              <SoftRow left="Annual diabetic exam due" right="Overdue" badge="Due" />
              <SoftRow left="CL follow-up" right="This week" />
            </GlassPanel>
            <GlassPanel ai style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 700, color: theme.violet }}>Review reply draft</div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.navyMuted }}>
                Approve before publish. No auto-posting.
              </div>
            </GlassPanel>
          </div>
        </AppChrome>
      </ScreenshotOrMock>
    </Frame>
    <CaptionBar
      title="Billing, care gaps, and reputation"
      caption="Invoice drafts, care-gap queues, and Google review replies with approve-before-publish."
    />
  </>
);

export const SceneSafety: React.FC = () => {
  const checks = [
    ['MFA for staff', 'Ready'],
    ['RLS verification', 'Ready'],
    ['Vendor BAAs', 'Needs config'],
    ['Backup restore', 'Attested'],
    ['Monitoring', 'Verified'],
    ['Audit logs', 'Ready'],
  ] as const;

  return (
    <>
      <Frame accent={theme.navy}>
        <ScreenshotOrMock shot="phi-readiness" style={{ width: '100%', height: '100%' }}>
          <AppChrome title="PHI readiness · Controlled pilot">
            <div style={{ flex: 1, padding: 18 }}>
              <GlassPanel style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Live PHI enablement</div>
                    <div style={{ color: theme.navyMuted, fontSize: 13, marginTop: 4 }}>
                      Fail-closed until readiness checks and BAAs are complete.
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: theme.danger,
                      background: 'rgba(209,58,58,0.12)',
                      padding: '8px 14px',
                      borderRadius: 999,
                    }}
                  >
                    Blocked
                  </div>
                </div>
              </GlassPanel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {checks.map(([label, state]) => (
                  <GlassPanel key={label} style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: theme.success, fontSize: 12 }}>
                      {state}
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </div>
          </AppChrome>
        </ScreenshotOrMock>
      </Frame>
      <CaptionBar
        title="Built for safe pilots"
        caption="MFA, RLS, vendor BAAs, backups, monitoring, audit logs, and fail-closed live PHI."
      />
    </>
  );
};

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = floatIn(frame, fps, 2);

  return (
    <AbsoluteFill>
      <LensBackground accent={theme.primary} />
      <AbsoluteFill style={{ padding: '48px 64px 190px', fontFamily: theme.fontSans }}>
        <div style={{ ...logo, height: '100%' }}>
          <ScreenshotOrMock shot="cta" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 84, fontWeight: 750, color: theme.navy, letterSpacing: '-0.04em' }}>
                EyeQ
              </div>
              <div style={{ marginTop: 12, fontSize: 26, color: theme.navyMuted }}>
                Pilot-ready for modern optometry practices.
              </div>
              <div
                style={{
                  marginTop: 28,
                  background: theme.primary,
                  color: theme.white,
                  fontWeight: 700,
                  fontSize: 22,
                  padding: '16px 36px',
                  borderRadius: 14,
                  boxShadow: theme.shadow,
                }}
              >
                Schedule a demo
              </div>
            </div>
          </ScreenshotOrMock>
        </div>
      </AbsoluteFill>
      <CaptionBar
        title="EyeQ"
        subtitle="Pilot-ready for modern optometry practices."
        caption="Schedule a demo and see the full workflow with sample practice data."
      />
    </AbsoluteFill>
  );
};
