import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/auth/require';
import { serverEnv } from '@/lib/env';
import { isAiAvailable, isProviderConfigured, routeModel } from '@/lib/ai-gateway';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await assertPermission('ai:configure');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const route = routeModel('ASSISTANT_CHAT');
  const [recentUsage, blockedCount, phiEvents] = await Promise.all([
    db.aiUsageRecord.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    db.blockedAiRequest.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    db.phiDetectionEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({
    emergencyShutdown: serverEnv.aiEmergencyShutdown,
    hipaaMode: serverEnv.aiHipaaMode,
    baaConfirmed: serverEnv.aiBaaConfirmed,
    allowPhi: serverEnv.aiAllowPhi,
    primaryProvider: serverEnv.aiProvider,
    primaryModel: route.model,
    fallbackProvider: serverEnv.aiFallbackProvider,
    assistantAvailable: isAiAvailable(),
    llmConfigured: isProviderConfigured(route.vendor),
    transcriptionConfigured: Boolean(serverEnv.transcriptionApiKey),
    imagingConfigured: Boolean(serverEnv.imagingAiApiKey) || serverEnv.imagingAnalysisMode !== 'manual',
    usageLast24h: recentUsage,
    blockedLast7d: blockedCount,
    phiEventsLast7d: phiEvents,
  });
}
