import Link from 'next/link';
import {
  AlertTriangle,
  Brain,
  CalendarX,
  ClipboardList,
  Image as ImageIcon,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { computePracticeIntelligence } from '@/lib/intelligence/practice';
import { formatDate, formatPercent } from '@/lib/utils';

export const metadata = { title: 'Timeline Intelligence' };

export default async function TimelineIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireStaffUser();
  await requirePermission('intelligence:read');
  if (!user.organizationId) return null;
  const params = await searchParams;

  const canSeePractice = hasPermission(user.role, 'intelligence:practice');

  const [patients, practice] = await Promise.all([
    db.patient.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(params.q
          ? {
              OR: [
                { firstName: { contains: params.q, mode: 'insensitive' } },
                { lastName: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hasDiabetes: true,
        hasGlaucomaPersonal: true,
        hasGlaucomaFamily: true,
        _count: {
          select: {
            appointments: true,
            imagingCases: true,
            careGaps: { where: { status: { in: ['DUE', 'OVERDUE'] } } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 80,
    }),
    canSeePractice
      ? computePracticeIntelligence(user.organizationId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Brain className="h-6 w-6 text-primary" /> Timeline Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">
          Longitudinal memory of every patient, what changed, what&apos;s
          unresolved, and what should get attention next. Always explainable,
          never a black box.
        </p>
      </div>

      {practice ? <PracticeStrip practice={practice} /> : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pick a patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Search name…"
                className="pl-8"
              />
            </form>
            {patients.length === 0 ? (
              <EmptyState title="No matching patients" />
            ) : (
              <ul className="-mx-2 max-h-[600px] space-y-0.5 overflow-y-auto pr-1">
                {patients.map((p) => {
                  const openGaps = p._count.careGaps;
                  const tags: string[] = [];
                  if (p.hasGlaucomaPersonal) tags.push('Glaucoma');
                  if (p.hasGlaucomaFamily) tags.push('Glaucoma FH');
                  if (p.hasDiabetes) tags.push('DM');
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/provider/timeline-intelligence/${p.id}`}
                        className="flex items-start justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                      >
                        <div className="space-y-0.5">
                          <div className="font-medium">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p._count.appointments} visits ·{' '}
                            {p._count.imagingCases} imaging
                            {tags.length > 0 ? ` · ${tags.join(', ')}` : ''}
                          </div>
                        </div>
                        {openGaps > 0 ? (
                          <Badge variant="warning" className="shrink-0">
                            {openGaps} gap{openGaps > 1 ? 's' : ''}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> How EyeQ remembers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Pick a patient on the left to see their longitudinal timeline,
              clinical memory cards, follow-up risk, imaging progression
              notes, and suggested questions to revisit at the next visit.
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <strong>Timeline Summary</strong>, every appointment, imaging
                study, signed note, prescription, message, and care gap on a
                single chronological axis.
              </li>
              <li>
                <strong>Clinical Memory</strong>, unresolved issues, prior
                recommendations, repeated complaints, deferred testing,
                lifestyle considerations, communication preferences.
              </li>
              <li>
                <strong>Follow-up Risk</strong>, a heuristic 0–100 score with
                full transparency about which factors moved the needle.
              </li>
              <li>
                <strong>Why EyeQ Flagged This</strong>, every signal carries
                the underlying data so the provider can verify in seconds.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              EyeQ AI surfaces review-support signals only. It does not
              diagnose disease. Final clinical interpretation is the
              responsibility of the supervising provider.
            </p>
          </CardContent>
        </Card>
      </div>

      {practice ? <PracticeDetail practice={practice} /> : null}
    </div>
  );
}

function PracticeStrip({
  practice,
}: {
  practice: NonNullable<Awaited<ReturnType<typeof computePracticeIntelligence>>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StripStat
        icon={AlertTriangle}
        label="Falling through cracks"
        value={practice.fallingThroughCracks.length}
        tone="destructive"
      />
      <StripStat
        icon={CalendarX}
        label="No-show patterns"
        value={practice.noShowPatterns.length}
        tone="warning"
      />
      <StripStat
        icon={ImageIcon}
        label="Imaging review delays"
        value={practice.imagingReviewDelays.length}
        tone="warning"
      />
      <StripStat
        icon={TrendingUp}
        label="Follow-up completion"
        value={formatPercent(practice.followUpCompletion.rate)}
        tone="info"
      />
    </div>
  );
}

function StripStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string | number;
  tone: 'destructive' | 'warning' | 'info' | 'success';
}) {
  const toneClass =
    tone === 'destructive'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-amber-600'
        : tone === 'success'
          ? 'text-emerald-600'
          : 'text-primary';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <Icon className={`h-5 w-5 ${toneClass}`} />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeDetail({
  practice,
}: {
  practice: NonNullable<Awaited<ReturnType<typeof computePracticeIntelligence>>>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Patients
            falling through the cracks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practice.fallingThroughCracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No patients with stale gaps and no future visit.
            </p>
          ) : (
            <ul className="divide-y">
              {practice.fallingThroughCracks.map((p) => (
                <li
                  key={p.patientId}
                  className="flex items-start justify-between gap-3 py-2"
                >
                  <div>
                    <Link
                      href={`/provider/timeline-intelligence/${p.patientId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {p.patientName}
                    </Link>
                    <ul className="mt-0.5 text-xs text-muted-foreground">
                      {p.why.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                  <Badge variant={p.severity === 'priority' ? 'destructive' : 'warning'}>
                    {p.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarX className="h-4 w-4 text-amber-500" /> No-show patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practice.noShowPatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No repeated no-show patients in the last 18 months.
            </p>
          ) : (
            <ul className="divide-y">
              {practice.noShowPatterns.map((p) => (
                <li
                  key={p.patientId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <Link
                    href={`/provider/timeline-intelligence/${p.patientId}`}
                    className="font-medium hover:underline"
                  >
                    {p.patientName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {p.noShowCount} no-shows · {formatPercent(p.rate)} rate
                    {p.lastNoShowAt ? ` · last ${formatDate(p.lastNoShowAt)}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-sky-500" /> Imaging review
            delays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practice.imagingReviewDelays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No imaging studies waiting for review.
            </p>
          ) : (
            <ul className="divide-y">
              {practice.imagingReviewDelays.map((i) => (
                <li
                  key={i.imagingCaseId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <Link
                    href={`/provider/imaging/${i.imagingCaseId}`}
                    className="font-medium hover:underline"
                  >
                    {i.patientName} · {i.imageType.replace('_', ' ')}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    Captured {formatDate(i.capturedAt)} · waiting {i.waitingDays} day
                    {i.waitingDays === 1 ? '' : 's'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-orange-500" /> Recall
            leakage by type
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practice.recallLeakage.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open recall gaps.
            </p>
          ) : (
            <ul className="divide-y">
              {practice.recallLeakage.map((r) => (
                <li key={r.type} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.type}</span>
                    <Badge variant="warning">{r.overdueCount} open</Badge>
                  </div>
                  <ul className="mt-0.5 text-xs text-muted-foreground">
                    {r.sample.map((s) => (
                      <li key={s.patientId}>
                        •{' '}
                        <Link
                          href={`/provider/timeline-intelligence/${s.patientId}`}
                          className="hover:underline"
                        >
                          {s.patientName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
