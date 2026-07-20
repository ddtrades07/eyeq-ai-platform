import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatFullName } from '@/lib/utils';
import { ExamChartWorkspace } from '@/components/exam/exam-chart-workspace';
import { getOrCreateExamChart } from '@/server/actions/exam-chart';
import type { ExamSectionData } from '@/lib/exam/sections';

export const metadata = { title: 'Exam chart' };

export default async function EncounterExamPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const user = await requirePermission('notes:write');
  if (!user.organizationId) return null;
  const { encounterId } = await params;

  const encounter = await db.encounter.findUnique({
    where: { id: encounterId },
    include: {
      patient: true,
      appointment: true,
      examChart: true,
    },
  });
  if (!encounter) notFound();
  assertSameOrg(user, encounter);

  let chart = encounter.examChart;
  if (!chart) {
    const created = await getOrCreateExamChart({ encounterId });
    if (!created.ok) notFound();
    chart = created.data;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/provider/patients/${encounter.patientId}`}>
          <ArrowLeft className="h-4 w-4" /> Back to chart
        </Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Exam — {formatFullName(encounter.patient.firstName, encounter.patient.lastName)}
          </h2>
          <span className="rounded-md border border-border/60 bg-white/70 px-2 py-0.5 text-xs font-medium">
            {chart!.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Structured optometry exam. Draft until signed by provider. Never auto-signs.
          AI inserts require review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encounter exam workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <ExamChartWorkspace
            chartId={chart!.id}
            encounterId={encounterId}
            status={chart!.status}
            initialSections={(chart!.sectionData as ExamSectionData) ?? {}}
            signed={chart!.status === 'SIGNED'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
