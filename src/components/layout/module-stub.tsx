import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wrench, type LucideIcon } from 'lucide-react';

/**
 * Reusable "module not yet shipped" surface so every nav entry resolves
 * to a polished page while we incrementally build the deeper workflow.
 */
export function ModuleStub({
  title,
  description,
  icon: Icon = Wrench,
  features,
  status = 'In design',
  safetyNote,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  features: { name: string; description: string }[];
  status?: string;
  safetyNote?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="info">{status}</Badge>
      </div>

      {safetyNote ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {safetyNote}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> What this module will do
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.name} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-primary" /> {f.name}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it lives in the platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• All data is multi-tenant: every row carries an <code>organizationId</code>.</p>
          <p>• Access is gated by RBAC permissions in <code>src/lib/auth/rbac.ts</code>.</p>
          <p>• Mutations go through validated server actions and emit an audit record.</p>
          <p>• AI suggestions are review-only, providers confirm and sign off.</p>
        </CardContent>
      </Card>
    </div>
  );
}
