import { Clock, ClipboardList, Workflow, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { mergeWorkflowTemplates } from '@/lib/workflow/defaults';
import { WorkflowEditor } from '@/components/workflow/workflow-editor';

export const metadata = { title: 'Workflow builder' };

export default async function WorkflowBuilderPage() {
  const user = await requireStaffUser();
  await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [counts, orgWorkflows] = await Promise.all([
    db.appointment.groupBy({
      by: ['type'],
      where: { organizationId: user.organizationId, startsAt: { gte: startOfMonth } },
      _count: { _all: true },
      _avg: { durationMinutes: true },
    }),
    db.visitWorkflowTemplate.findMany({
      where: { organizationId: user.organizationId },
    }),
  ]);

  const templates = mergeWorkflowTemplates(orgWorkflows);
  const countByType = new Map(counts.map((r) => [r.type, r]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Workflow builder</h2>
        <p className="text-sm text-muted-foreground">
          Customize visit-type checklists for your practice. Saved workflows feed
          the pretest queue, scheduling defaults, and AI documentation prompts.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((t) => {
          const usage = countByType.get(t.type);
          const avg = usage?._avg.durationMinutes ?? null;
          const avgDelta = avg ? Math.round(avg - t.durationMinutes) : null;
          return (
            <Card key={t.type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {t.type.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3" /> {t.durationMinutes} min
                    </Badge>
                    {usage ? (
                      <span className="text-[11px] text-muted-foreground">
                        MTD: {usage._count._all} visits
                        {avgDelta !== null && Math.abs(avgDelta) >= 5
                          ? ` · avg ${Math.round(avg!)} min (${avgDelta > 0 ? '+' : ''}${avgDelta})`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Section icon={ClipboardList} title="Pretest checklist" items={t.pretest} />
                {t.imaging.length ? (
                  <Section icon={Sparkles} title="Imaging defaults" items={t.imaging} />
                ) : null}
                <Section icon={Workflow} title="Care pathway" items={t.carePathway} ordered />
                <WorkflowEditor template={t} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  ordered,
}: {
  icon: typeof Clock;
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) return null;
  const List = ordered ? 'ol' : 'ul';
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <List
        className={
          ordered
            ? 'ml-4 list-decimal space-y-1 text-sm'
            : 'space-y-1 text-sm'
        }
      >
        {items.map((it, i) => (
          <li key={i} className={ordered ? '' : 'flex gap-2'}>
            {ordered ? (
              it
            ) : (
              <>
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{it}</span>
              </>
            )}
          </li>
        ))}
      </List>
    </div>
  );
}
