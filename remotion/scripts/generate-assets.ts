/**
 * Generate polished product mock images + AI voiceover for EyeQDemo.
 * Uses Playwright for screenshots and edge-tts for narration.
 *
 *   npm run assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'assets', 'screenshots');
const VO_DIR = path.join(ROOT, 'assets', 'voiceover');

type SceneAsset = {
  id: string;
  shot: string;
  title: string;
  subtitle?: string;
  voiceover: string;
  panels: string[];
};

const SCENES: SceneAsset[] = [
  {
    id: 'hero',
    shot: 'hero',
    title: 'EyeQ',
    subtitle: 'Optometry operating system',
    voiceover:
      'Welcome to EyeQ, a modern optometry operating system for private practices. One connected platform for clinical care, operations, and patient communication.',
    panels: ['Clinical chart', 'Scheduling', 'Patient portal', 'AI assist', 'Imaging', 'Safe pilots'],
  },
  {
    id: 'platform',
    shot: 'dashboard',
    title: 'Practice dashboard',
    voiceover:
      'Start with practice operations. The dashboard, scheduling board, check-in flow, and staff tasks keep the front office moving from the first arrival of the day.',
    panels: ['12 checked in', '4 in exam', '7 staff tasks', 'Schedule board', 'Walk-ins', 'Care gaps'],
  },
  {
    id: 'clinical',
    shot: 'patient-chart',
    title: 'Patient chart · Demo',
    voiceover:
      'Inside the patient chart, providers review history, run encounters, draft SOAP notes, and sign when ready. Nothing auto-signs. Clinical judgment stays with the provider.',
    panels: ['Overview', 'Encounter', 'SOAP draft', 'Sign-off required', 'Exam chart', 'History'],
  },
  {
    id: 'imaging',
    shot: 'imaging-review',
    title: 'Imaging review',
    voiceover:
      'Imaging stays connected to the chart. Upload studies, compare views, and complete provider review without leaving the patient record.',
    panels: ['OD study', 'OS study', 'Compare', 'Provider review', 'Upload', 'Timeline'],
  },
  {
    id: 'rx-optical',
    shot: 'rx-optical',
    title: 'Rx & optical',
    voiceover:
      'EyeQ supports glasses and contact lens prescriptions with draft and provider sign-off, plus optical order workflows for the dispensary.',
    panels: ['Glasses Rx draft', 'CL Rx', 'Provider sign', 'Optical order', 'Dispensary', 'Status'],
  },
  {
    id: 'ai',
    shot: 'ai-copilot',
    title: 'Ask EyeQ',
    voiceover:
      'Ask EyeQ, pre-charting help, SOAP drafts, and patient message drafts support the team. Every AI output is a draft and requires provider review before clinical use. EyeQ does not diagnose disease.',
    panels: ['Ask EyeQ', 'Pre-chart draft', 'SOAP assist', 'Message draft', 'Review required', 'No auto-sign'],
  },
  {
    id: 'portal',
    shot: 'patient-portal',
    title: 'Patient portal',
    voiceover:
      'Patients use the portal for visits, prescriptions, and secure messages. Reminder previews respect communication consent, and SMS or email only send when vendors and BAAs are ready.',
    panels: ['Visits', 'Rx', 'Secure messages', 'Reminder preview', 'Consent', 'Book request'],
  },
  {
    id: 'business',
    shot: 'business',
    title: 'Billing · Care gaps · Reviews',
    voiceover:
      'On the business side, EyeQ includes invoice drafts, care gap queues, and Google review management. AI can draft a reply, but nothing auto-posts, and demo mode never invents a live publish.',
    panels: ['Invoice draft', 'Care gaps', 'Google reviews', 'Approve reply', 'No auto-post', 'Demo safe'],
  },
  {
    id: 'safety',
    shot: 'phi-readiness',
    title: 'PHI readiness',
    voiceover:
      'EyeQ is built for safe pilots. MFA, row level security verification, vendor BAA status, backup attestation, monitoring, and audit logs gate live PHI. Until those checks pass, production PHI stays fail-closed.',
    panels: ['MFA', 'RLS', 'Vendor BAA', 'Backups', 'Monitoring', 'Audit logs'],
  },
  {
    id: 'cta',
    shot: 'cta',
    title: 'Schedule a demo',
    subtitle: 'Pilot-ready for modern optometry practices',
    voiceover:
      'EyeQ. Pilot-ready for modern optometry practices. Schedule a demo and see the full workflow with sample practice data.',
    panels: ['Demo data only', 'No live PHI', 'Provider review required', 'Fail-closed PHI'],
  },
];

function mockHtml(scene: SceneAsset): string {
  const tiles = scene.panels
    .map(
      (p, i) => `
      <div class="tile" style="animation-delay:${i * 40}ms">
        <div class="tile-label">${p}</div>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 1920px; height: 1080px; font-family: Inter, Segoe UI, system-ui, sans-serif;
    background: linear-gradient(145deg, #E8F1F8 0%, #F4F8FB 48%, #E6ECF5 100%);
    color: #162033; overflow: hidden; position: relative;
  }
  .orb1 { position:absolute; width:700px; height:700px; border-radius:50%; right:-120px; top:-180px;
    background: radial-gradient(circle, rgba(31,168,184,0.28), transparent 68%); }
  .orb2 { position:absolute; width:520px; height:520px; border-radius:50%; left:-100px; bottom:-140px;
    background: radial-gradient(circle, rgba(123,108,240,0.2), transparent 70%); }
  .shell {
    position: absolute; inset: 56px 64px 56px 64px;
    background: rgba(255,255,255,0.92); border: 1px solid rgba(120,160,200,0.35);
    border-radius: 24px; box-shadow: 0 18px 48px -18px rgba(40,70,110,0.28);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .top {
    display:flex; align-items:center; gap:14px; padding:18px 22px;
    border-bottom: 1px solid rgba(120,160,200,0.3); background: rgba(255,255,255,0.95);
  }
  .logo {
    width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(135deg, #1FA8B8, #1B6FBF 55%, #7B6CF0);
  }
  .brand { font-weight: 800; font-size: 18px; letter-spacing: -0.02em; }
  .title { color: #3A4660; font-size: 15px; font-weight: 600; }
  .badge {
    margin-left: auto; background: #1FA8B8; color: #fff; font-size: 11px; font-weight: 800;
    padding: 5px 10px; border-radius: 999px; letter-spacing: 0.06em;
  }
  .body { flex: 1; padding: 28px 30px; display: flex; flex-direction: column; gap: 22px; }
  h1 { margin: 0; font-size: 42px; letter-spacing: -0.03em; }
  .sub { margin: 0; color: #3A4660; font-size: 20px; max-width: 980px; line-height: 1.35; }
  .grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 8px;
  }
  .tile {
    background: rgba(248,251,255,0.95); border: 1px solid rgba(120,160,200,0.28);
    border-radius: 16px; min-height: 120px; padding: 18px; display: flex; align-items: flex-end;
    box-shadow: 0 8px 22px -14px rgba(40,70,110,0.2);
  }
  .tile-label { font-weight: 700; font-size: 18px; }
  .footer {
    padding: 14px 22px; border-top: 1px solid rgba(120,160,200,0.28);
    color: #3A4660; font-size: 13px; font-weight: 600;
  }
</style>
</head>
<body>
  <div class="orb1"></div><div class="orb2"></div>
  <div class="shell">
    <div class="top">
      <div class="logo"></div>
      <div class="brand">EyeQ</div>
      <div class="title">${scene.title}</div>
      <div class="badge">DEMO</div>
    </div>
    <div class="body">
      <h1>${scene.title}</h1>
      ${scene.subtitle ? `<p class="sub">${scene.subtitle}</p>` : `<p class="sub">Demo practice data · No live PHI</p>`}
      <div class="grid">${tiles}</div>
    </div>
    <div class="footer">EyeQ product demo · Sample data only · AI drafts require provider review</div>
  </div>
</body>
</html>`;
}

async function generateImages() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const scene of SCENES) {
    await page.setContent(mockHtml(scene), { waitUntil: 'domcontentloaded' });
    const out = path.join(SHOT_DIR, `${scene.shot}.png`);
    await page.screenshot({ path: out, type: 'png' });
    console.log(`[assets] image → ${scene.shot}.png`);
  }

  await browser.close();
}

async function generateVoiceover() {
  fs.mkdirSync(VO_DIR, { recursive: true });
  // Natural neural voice via Microsoft Edge TTS (no API key).
  const voice = process.env.EYEQ_TTS_VOICE || 'en-US-JennyNeural';

  for (const scene of SCENES) {
    const out = path.join(VO_DIR, `${scene.id}.mp3`);
    const tmpText = path.join(VO_DIR, `${scene.id}.txt`);
    fs.writeFileSync(tmpText, scene.voiceover, 'utf8');
    try {
      execFileSync(
        'python',
        [
          '-m',
          'edge_tts',
          '--voice',
          voice,
          '--file',
          tmpText,
          '--write-media',
          out,
          '--rate',
          '-5%',
        ],
        { stdio: 'inherit' },
      );
      console.log(`[assets] voice → ${scene.id}.mp3`);
    } finally {
      if (fs.existsSync(tmpText)) fs.unlinkSync(tmpText);
    }
  }
}

async function main() {
  const only = process.argv[2];
  if (!only || only === 'images') await generateImages();
  if (!only || only === 'voice') await generateVoiceover();
  console.log('[assets] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
