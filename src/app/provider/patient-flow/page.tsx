import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PatientFlowBoard } from '@/components/patient-flow/patient-flow-board';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { listPatientFlowToday } from '@/server/queries/patient-flow';
import { Users } from 'lucide-react';

export const metadata = { title: 'Patient flow' };

export default async function PatientFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const user = await requirePermission('appointments:read');
  if (!user.organizationId) return null;

  const params = await searchParams;
  const rows = await listPatientFlowToday({
    organizationId: user.organizationId,
    locationId: params.locationId ?? null,
  });

  const canUpdateStatus = hasPermission(user.role, 'appointments:status');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patient flow</h1>
          <p className="text-sm text-muted-foreground">
            Real-time front desk queue for today. Clinical details are not shown on this board.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/provider/appointments">Open schedule</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No active patients on the board"
          description="Scheduled patients for today will appear here as they check in."
        />
      ) : (
        <PatientFlowBoard rows={rows} canUpdateStatus={canUpdateStatus} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            'Scheduled',
            'Confirmed',
            'Checked in',
            'In pretest',
            'With doctor',
            'In optical',
            'Completed',
          ].map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
