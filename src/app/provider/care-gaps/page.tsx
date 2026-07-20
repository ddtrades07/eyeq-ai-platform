import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CareGapRowActions } from '@/components/care-gaps/row-actions';
import { RecomputeCareGapsButton } from '@/components/care-gaps/recompute-button';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission, ROLE_LABELS } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';
import { resolveActiveLocationId } from '@/lib/location/server';

export const metadata = { title: 'Care gaps' };

export default async function CareGapsPage() {
  const user = await requirePermission('caregaps:read');
  if (!user.organizationId) return null;

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const gaps = await db.careGap.findMany({
    where: {
      organizationId: user.organizationId,
      status: { in: ['DUE', 'OVERDUE', 'CONTACTED'] },
      ...(locationId
        ? { patient: { appointments: { some: { locationId } } } }
        : {}),
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 200,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const canManage = hasPermission(user.role, 'caregaps:manage');

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="care_gaps" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Care gaps</h2>
          <p className="text-sm text-muted-foreground">
            {gaps.length} open item{gaps.length === 1 ? '' : 's'} across the practice.
          </p>
        </div>
        {canManage ? <RecomputeCareGapsButton /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {gaps.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ClipboardList}
                title="No open care gaps"
                description="Recompute to scan for overdue annual exams, expiring prescriptions, and other gaps."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Suggested</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Badge variant={priorityVariant(g.priority)}>
                        {priorityLabel(g.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/provider/patients/${g.patient.id}`} className="hover:underline">
                        {formatFullName(g.patient.firstName, g.patient.lastName)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{humanize(g.type)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {g.dueDate ? formatDate(g.dueDate) : '-'}
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-muted-foreground">
                      {g.suggestedAction ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {g.assignedRole ? ROLE_LABELS[g.assignedRole] : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.status === 'OVERDUE' ? 'destructive' : 'warning'}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? <CareGapRowActions careGapId={g.id} /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function priorityVariant(priority: number): 'destructive' | 'warning' | 'info' | 'secondary' {
  if (priority <= 0) return 'destructive';
  if (priority === 1) return 'warning';
  if (priority === 2) return 'info';
  return 'secondary';
}

function priorityLabel(priority: number): string {
  if (priority <= 0) return 'Critical';
  if (priority === 1) return 'High';
  if (priority === 2) return 'Attention';
  return 'Routine';
}
