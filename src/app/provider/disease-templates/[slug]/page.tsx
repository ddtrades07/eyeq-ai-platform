import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import {
  STARTER_DISEASE_TEMPLATES,
  getTemplateBySlug,
} from '@/lib/templates/disease-templates';

export async function generateStaticParams() {
  return STARTER_DISEASE_TEMPLATES.map((t) => ({ slug: t.slug }));
}

export default async function DiseaseTemplateDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireStaffUser();
  const user = await requirePermission('templates:read');
  if (!user.organizationId) return null;
  const { slug } = await params;

  const starter = getTemplateBySlug(slug);
  const custom = await db.diseaseTemplate.findFirst({
    where: { organizationId: user.organizationId, slug, isActive: true },
  });

  const data = custom ?? starter;
  if (!data) notFound();

  const sections: { title: string; items: string[] }[] = [
    { title: 'HPI prompts', items: (data as { hpiPrompts: string[] }).hpiPrompts },
    { title: 'Exam elements', items: (data as { examElements: string[] }).examElements },
    { title: 'Assessment options', items: (data as { assessmentOptions: string[] }).assessmentOptions },
    { title: 'Plan options', items: (data as { planOptions: string[] }).planOptions },
    { title: 'Patient education', items: (data as { educationPoints: string[] }).educationPoints },
    { title: 'Coding suggestions', items: (data as { codingSuggestions: string[] }).codingSuggestions },
    { title: 'Referral criteria', items: (data as { referralCriteria: string[] }).referralCriteria },
    { title: 'Follow-up options', items: (data as { followUpOptions: string[] }).followUpOptions },
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/disease-templates">
          <ArrowLeft className="h-4 w-4" /> Back to templates
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{data.name}</h2>
          <p className="text-sm text-muted-foreground">{(data as { category: string }).category}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={custom ? 'success' : 'secondary'}>
            {custom ? 'Practice template' : 'Starter template'}
          </Badge>
        </div>
      </div>

      <SafetyDisclaimer />

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Documentation assistance only. The provider selects or confirms the
          condition, edits the language, and signs the final note.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {s.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {s.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
