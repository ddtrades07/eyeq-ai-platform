import Link from 'next/link';
import { BookOpenCheck, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import {
  STARTER_DISEASE_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from '@/lib/templates/disease-templates';

export const metadata = { title: 'Clinical resources' };

export default async function DiseaseTemplatesPage() {
  await requireStaffUser();
  const user = await requirePermission('templates:read');
  if (!user.organizationId) return null;

  const customTemplates = await db.diseaseTemplate.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Clinical resources</h2>
        <p className="text-sm text-muted-foreground">
          High-yield workup checklists and documentation scaffolds. The provider
          selects, confirms, and signs the final diagnosis and plan.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-sky-200/60 bg-sky-50/60 p-3 text-xs text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Coding suggestions are illustrative only. Validate against your
          coding policy and payer rules before applying.
        </p>
      </div>

      {customTemplates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Practice templates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {customTemplates.map((t) => (
              <Link
                key={t.id}
                href={`/provider/disease-templates/${t.slug}`}
                className="block rounded-md border bg-background p-3 transition hover:bg-accent"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> {t.name}
                </div>
                <p className="text-xs text-muted-foreground">{t.category}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {TEMPLATE_CATEGORIES.map((category) => {
        const items = STARTER_DISEASE_TEMPLATES.filter((t) => t.category === category);
        if (items.length === 0) return null;
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-primary" /> {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {items.map((t) => (
                <Link
                  key={t.slug}
                  href={`/provider/disease-templates/${t.slug}`}
                  className="block rounded-md border bg-background p-3 transition hover:bg-accent"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {t.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.hpiPrompts.length} HPI prompts · {t.examElements.length} exam
                    elements · {t.planOptions.length} plan options
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">Starter</Badge>
                    {t.referralCriteria.length > 0 ? (
                      <Badge variant="info">Referral criteria</Badge>
                    ) : null}
                    {t.codingSuggestions.length > 0 ? (
                      <Badge variant="outline">Coding hints</Badge>
                    ) : null}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
