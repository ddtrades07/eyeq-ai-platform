import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Brain,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { computePatientIntelligence } from '@/lib/intelligence/patient';
import {
  calculateAge,
  formatDate,
  formatFullName,
} from '@/lib/utils';
import { FlagList } from '@/components/intelligence/flag-card';
import { AttentionGraph } from '@/components/intelligence/attention-graph';
import { FollowUpRiskCard } from '@/components/intelligence/followup-risk';
import { LongitudinalTimeline } from '@/components/intelligence/longitudinal-timeline';
import { ClinicalMemoryCards } from '@/components/intelligence/clinical-memory';

export const metadata = { title: 'Timeline Intelligence, Patient' };

export default async function PatientIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaffUser();
  await requirePermission('intelligence:read');
  if (!user.organizationId) return null;
  const { id } = await params;

  const patient = await db.patient.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      phone: true,
      hasDiabetes: true,
      hasGlaucomaPersonal: true,
      hasGlaucomaFamily: true,
      hasHypertension: true,
      isSmoker: true,
    },
  });
  if (!patient) notFound();

  const intelligence = await computePatientIntelligence(id, user.organizationId);
  if (!intelligence) notFound();

  const fullName = formatFullName(patient.firstName, patient.lastName);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/provider/timeline-intelligence">
            <ArrowLeft className="h-4 w-4" /> Back to Timeline Intelligence
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/provider/patients/${patient.id}`}>Open full chart</Link>
        </Button>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Brain className="h-6 w-6 text-primary" /> {fullName}
        </h2>
        <p className="text-sm text-muted-foreground">
          {calculateAge(patient.dateOfBirth)} y/o · DOB{' '}
          {formatDate(patient.dateOfBirth)}
          {patient.email ? ` · ${patient.email}` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {patient.hasGlaucomaPersonal ? (
            <Badge variant="warning">Glaucoma</Badge>
          ) : null}
          {patient.hasGlaucomaFamily ? (
            <Badge variant="info">Glaucoma FH</Badge>
          ) : null}
          {patient.hasDiabetes ? <Badge variant="warning">DM</Badge> : null}
          {patient.hasHypertension ? (
            <Badge variant="warning">HTN</Badge>
          ) : null}
          {patient.isSmoker ? (
            <Badge variant="destructive">Smoker</Badge>
          ) : null}
        </div>
      </div>

      {/* Summary strip + risk */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Timeline summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-1">
              {intelligence.summary.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Generated {intelligence.generatedAt.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <FollowUpRiskCard risk={intelligence.followUpRisk} />
      </div>

      <Tabs defaultValue="attention">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="attention">
            <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Clinical attention
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Brain className="mr-1.5 h-3.5 w-3.5" /> Clinical memory
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="imaging">
            <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> Imaging progression
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Timer className="mr-1.5 h-3.5 w-3.5" /> Longitudinal timeline
          </TabsTrigger>
          <TabsTrigger value="questions">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Questions to revisit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attention" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Attention factors</h3>
              <FlagList
                flags={intelligence.attentionFactors}
                emptyMessage="No clinical attention factors flagged."
              />
              {intelligence.providerAttentionAreas.length > 0 ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold">
                    Provider attention areas
                  </h3>
                  <FlagList
                    flags={intelligence.providerAttentionAreas}
                    emptyMessage="No priority items right now."
                  />
                </>
              ) : null}
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Clinical attention graph</CardTitle>
              </CardHeader>
              <CardContent>
                <AttentionGraph data={intelligence.attentionDistribution} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <ClinicalMemoryCards memory={intelligence.clinicalMemory} />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-3">
          <FlagList
            flags={intelligence.complianceInsights}
            emptyMessage="No compliance signals."
          />
        </TabsContent>

        <TabsContent value="imaging" className="space-y-3">
          <FlagList
            flags={intelligence.imagingProgressionNotes}
            emptyMessage="No imaging progression signals, needs at least 2 studies of the same type."
          />
        </TabsContent>

        <TabsContent value="timeline">
          <LongitudinalTimeline events={intelligence.timeline} />
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Suggested questions to revisit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intelligence.suggestedQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No suggested follow-up questions from the current rule set.
                </p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {intelligence.suggestedQuestions.map((q, i) => (
                    <li
                      key={i}
                      className="rounded-md border bg-muted/20 p-2 leading-snug"
                    >
                      {i + 1}. {q}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Documentation assistance only. The provider selects, confirms,
                and signs the final plan.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
