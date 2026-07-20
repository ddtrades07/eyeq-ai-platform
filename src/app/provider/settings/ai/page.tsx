import Link from 'next/link';
import { AlertTriangle, Bot, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { KV } from '@/components/ui/kv';
import { requirePermission } from '@/lib/auth/require';
import { serverEnv } from '@/lib/env';
import { isAiAvailable, isProviderConfigured, routeModel } from '@/lib/ai-gateway';
import { db } from '@/lib/db';
import { AddKnowledgeDocumentForm } from '@/components/ai/add-knowledge-form';

export const metadata = { title: 'AI Control Center' };

export default async function AiControlCenterPage() {
  const user = await requirePermission('ai:configure');
  if (!user.organizationId) return null;

  const route = routeModel('ASSISTANT_CHAT');
  const [usage24h, blocked7d, phi7d, providerConfigs] = await Promise.all([
    db.aiUsageRecord.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    db.blockedAiRequest.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.phiDetectionEvent.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.aiProviderConfig.findMany({
      where: { OR: [{ organizationId: user.organizationId }, { organizationId: null }] },
      orderBy: { vendor: 'asc' },
    }),
  ]);

  const assistantUp = isAiAvailable();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Control Center"
        description="Provider routing, safety controls, and usage monitoring. Compliance review required before production PHI."
        actions={
          <Link href="/provider/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Back to settings
          </Link>
        }
      />

      {serverEnv.aiEmergencyShutdown && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">
              Emergency AI shutdown is active. External AI calls are disabled.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" /> Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={assistantUp ? 'default' : 'secondary'}>
              {assistantUp ? 'Available' : 'Not configured'}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Primary: {serverEnv.aiProvider} / {route.model}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> PHI Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <KV k="HIPAA mode" v={serverEnv.aiHipaaMode ? 'On' : 'Off'} />
            <KV k="BAA confirmed" v={serverEnv.aiBaaConfirmed ? 'Yes' : 'No'} />
            <KV k="PHI events (7d)" v={String(phi7d)} />
            <KV k="Blocked (7d)" v={String(blocked7d)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" /> Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <KV k="Requests (24h)" v={String(usage24h)} />
            <KV k="LLM configured" v={isProviderConfigured(route.vendor) ? 'Yes' : 'No'} />
            <KV k="Transcription" v={serverEnv.transcriptionApiKey ? 'Configured' : 'Not configured'} />
            <KV k="Imaging AI" v={serverEnv.imagingAiApiKey ? 'Configured' : 'Manual / unavailable'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {providerConfigs.length === 0 ? (
            <p className="text-muted-foreground">
              No per-practice provider overrides. Routing uses environment variables.
              Set AI_PROVIDER, OPENAI_API_KEY or ANTHROPIC_API_KEY, and confirm BAA status before enabling PHI transmission.
            </p>
          ) : (
            <ul className="space-y-2">
              {providerConfigs.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b pb-2">
                  <span>{c.vendor}</span>
                  <Badge variant={c.enabled ? 'default' : 'secondary'}>
                    {c.baaConfirmed ? 'BAA' : 'No BAA'} · {c.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge base (RAG)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Add approved reference documents. Content is chunked and embedded for retrieval through the AI Gateway.
          </p>
          <AddKnowledgeDocumentForm />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This architecture does not alone make EyeQ HIPAA compliant. Legal, security, and compliance review
        must be completed before real PHI is used in production. AI output is preliminary until provider review.
      </p>
    </div>
  );
}
