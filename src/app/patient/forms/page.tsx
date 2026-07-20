import { FileCheck2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CompleteFormButton } from '@/components/portal/complete-form-button';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Forms' };

export default async function PatientFormsPage() {
  const session = await requirePortalPatient();

  const forms = await db.patientForm.findMany({
    where: { patientId: session.patientId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const pending = forms.filter((f) => f.status === 'PENDING');
  const completed = forms.filter((f) => f.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Forms</h2>
        <p className="text-sm text-muted-foreground">
          Forms from your care team. Completing them before your visit saves
          time at check in.
        </p>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No forms right now"
          description="When your care team sends you a form, it will appear here."
        />
      ) : (
        <>
          {pending.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                To complete
              </h3>
              {pending.map((form) => (
                <Card key={form.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      {form.title}
                      <Badge variant="warning">Needs your review</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {form.description ? (
                      <p className="text-muted-foreground">{form.description}</p>
                    ) : null}
                    <CompleteFormButton formId={form.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {completed.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Completed
              </h3>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {completed.map((form) => (
                      <li key={form.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="font-medium">{form.title}</span>
                        <span className="text-xs text-muted-foreground">
                          Completed {form.completedAt ? formatDate(form.completedAt) : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
