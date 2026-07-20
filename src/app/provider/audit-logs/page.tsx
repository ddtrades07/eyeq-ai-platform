import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Audit Logs' };

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  READ: 'Viewed',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOGIN: 'Signed in',
  LOGOUT: 'Signed out',
  EXPORT: 'Exported',
  SIGN_OFF: 'Signed off',
  AI_GENERATION: 'AI generation',
};

export default async function AuditLogsPage() {
  const user = await requirePermission('audit:read');

  const logs = await db.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          A record of key actions across your practice. Showing the most recent 200 events.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events yet"
          description="Actions like sign-offs, AI generations, and record changes will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="w-40 shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                  <span className="font-medium">
                    {log.user
                      ? formatFullName(log.user.firstName, log.user.lastName)
                      : 'System'}
                  </span>
                  <span className="text-muted-foreground">
                    {log.resourceType}
                    {log.resourceId ? ` (${log.resourceId.slice(0, 8)})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
