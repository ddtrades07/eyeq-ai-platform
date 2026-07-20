import { NextResponse } from 'next/server';
import { getOpsHealthSnapshot } from '@/lib/ops/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await getOpsHealthSnapshot();

  const checks: Record<string, { status: string; detail?: string }> = {};
  for (const s of snapshot.services) {
    checks[s.id] = {
      status: s.status === 'not_configured' ? 'degraded' : s.status,
      detail: s.detail,
    };
  }

  return NextResponse.json(
    {
      status: snapshot.overall,
      name: 'eyeq-ai-platform',
      timestamp: new Date().toISOString(),
      errorTrackingConfigured: snapshot.errorTrackingConfigured,
      checks,
      services: snapshot.services,
    },
    { status: snapshot.overall === 'down' ? 503 : 200 },
  );
}
