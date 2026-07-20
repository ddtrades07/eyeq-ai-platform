import { CheckCircle2, Circle, ShieldAlert, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { publicEnv, serverEnv } from '@/lib/env';
import { getImagingAnalysisMode, hasValidatedImagingProvider } from '@/lib/imaging/services/config';

export const metadata = { title: 'Installation readiness' };

type CheckItem = {
  id: string;
  label: string;
  status: 'ready' | 'action' | 'review';
  detail: string;
};

function statusBadge(status: CheckItem['status']) {
  if (status === 'ready') return <Badge variant="success">Ready</Badge>;
  if (status === 'review') return <Badge variant="warning">Review required</Badge>;
  return <Badge variant="outline">Action needed</Badge>;
}

export default async function InstallationReadinessPage() {
  await requirePermission('org:manage');
  const user = await requireStaffUser();

  const supabaseOk = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
  const aiProvider = serverEnv.aiProvider;
  const hasOpenAi = Boolean(serverEnv.openaiApiKey);
  const hasAnthropic = Boolean(serverEnv.anthropicApiKey);

  const imagingMode = getImagingAnalysisMode();
  const imagingProviderReady = hasValidatedImagingProvider() || imagingMode === 'development-mock';

  const checks: CheckItem[] = [
    {
      id: 'supabase',
      label: 'Supabase configured',
      status: supabaseOk ? 'ready' : 'action',
      detail: supabaseOk
        ? 'Database URL and anon key present.'
        : 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
    },
    {
      id: 'env',
      label: 'Environment variables',
      status: supabaseOk && serverEnv.databaseUrl ? 'ready' : 'action',
      detail: 'DATABASE_URL, Supabase keys, and optional AI keys in .env.local',
    },
    {
      id: 'migrations',
      label: 'Database migrations',
      status: 'action',
      detail: 'Run: npx prisma migrate deploy (or db:push for pilot)',
    },
    {
      id: 'storage',
      label: 'Storage buckets',
      status: 'action',
      detail: 'Configure Supabase storage bucket for imaging uploads (see docs/INSTALLATION_CHECKLIST.md)',
    },
    {
      id: 'auth',
      label: 'Auth configured',
      status: supabaseOk ? 'ready' : 'action',
      detail: 'Supabase Auth + matching User rows with supabaseUserId',
    },
    {
      id: 'roles',
      label: 'Roles configured',
      status: user.organizationId ? 'ready' : 'action',
      detail: 'Team members assigned Owner/Admin/Manager/Clinical/Front Desk roles',
    },
    {
      id: 'locations',
      label: 'Locations configured',
      status: user.organizationId ? 'ready' : 'action',
      detail: 'At least one active location; use location switcher for multi-site',
    },
    {
      id: 'team',
      label: 'Team invited',
      status: 'action',
      detail: 'Invite staff via Supabase Auth + Team page',
    },
    {
      id: 'ehr',
      label: 'EHR connection selected',
      status: 'action',
      detail: 'EHR Integration Center, placeholders until credentials configured',
    },
    {
      id: 'comms',
      label: 'Communication provider',
      status: 'action',
      detail: 'SMS/email vendor (Twilio/SES), mock until production keys',
    },
    {
      id: 'consent',
      label: 'SMS/email consent',
      status: 'review',
      detail: 'Document patient consent for reminders and portal messages',
    },
    {
      id: 'imaging',
      label: 'Imaging analysis provider',
      status: imagingMode === 'manual' ? 'review' : imagingProviderReady ? 'ready' : 'action',
      detail:
        imagingMode === 'manual'
          ? 'Manual review only, no automated clinical findings (recommended until validated model configured)'
          : imagingMode === 'development-mock'
            ? 'Development mock mode, not for production PHI'
            : imagingProviderReady
              ? `Mode: ${imagingMode}`
              : 'Set IMAGING_ANALYSIS_ENDPOINT + IMAGING_ANALYSIS_API_KEY',
    },
    {
      id: 'ai',
      label: 'AI provider configured',
      status: aiProvider === 'mock' ? 'action' : hasOpenAi || hasAnthropic ? 'ready' : 'action',
      detail:
        aiProvider === 'mock'
          ? `Mock mode (${process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock'}). Set OPENAI_API_KEY for live AI.`
          : `AI_PROVIDER=${aiProvider}`,
    },
    {
      id: 'audit',
      label: 'Audit logging enabled',
      status: 'ready',
      detail: 'AuditLog writes on clinical and admin mutations',
    },
    {
      id: 'backup',
      label: 'Backup plan documented',
      status: 'review',
      detail: 'Document Supabase backup / PITR and export procedures',
    },
    {
      id: 'hipaa',
      label: 'HIPAA / security review',
      status: 'review',
      detail: 'Required before production PHI, not certified in pilot build',
    },
    {
      id: 'baa',
      label: 'BAA requirements',
      status: 'review',
      detail: 'Execute BAAs with Supabase, AI vendor, SMS/email vendor before live PHI',
    },
  ];

  const readyCount = checks.filter((c) => c.status === 'ready').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Installation readiness</h2>
        <p className="text-sm text-muted-foreground">
          Pre-flight checklist for multi-office pilot deployment. {readyCount}/{checks.length} items
          marked ready in this environment.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 p-3 text-xs text-amber-950">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This checklist supports a <strong>controlled office pilot</strong>, not full HIPAA-certified
          clinical production. Complete security review and vendor BAAs before live PHI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="flex items-start gap-2">
                {c.status === 'ready' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
              </div>
              {statusBadge(c.status)}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Full detail: <code>docs/INSTALLATION_CHECKLIST.md</code> and{' '}
        <code>docs/MULTI_OFFICE_READINESS.md</code>
      </p>
    </div>
  );
}
