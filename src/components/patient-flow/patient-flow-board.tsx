'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppointmentStatus } from '@prisma/client';
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setAppointmentStatus } from '@/server/actions/appointments';
import { APPOINTMENT_STATUS_LABEL } from '@/components/appointments/status-badge';
import { formatFullName } from '@/lib/utils';
import type { PatientFlowRow } from '@/server/queries/patient-flow';

const FLOW_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PRETEST,
  AppointmentStatus.WITH_DOCTOR,
  AppointmentStatus.IN_OPTICAL,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
];

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function PatientFlowBoard({
  rows,
  canUpdateStatus,
}: {
  rows: PatientFlowRow[];
  canUpdateStatus: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function updateStatus(id: string, status: AppointmentStatus) {
    setPendingId(id);
    void (async () => {
      const r = await setAppointmentStatus({ id, status });
      setPendingId(null);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Updated to ${APPOINTMENT_STATUS_LABEL[status]}`);
      router.refresh();
    })();
  }

  const byStatus = FLOW_STATUSES.reduce(
    (acc, status) => {
      acc[status] = rows.filter((r) => r.status === status);
      return acc;
    },
    {} as Record<AppointmentStatus, PatientFlowRow[]>,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="On schedule" value={rows.length} />
        <Stat
          label="Waiting"
          value={rows.filter((r) => r.waitMinutes != null && r.waitMinutes > 0).length}
        />
        <Stat
          label="Balance alerts"
          value={rows.filter((r) => r.openInvoiceBalanceCents > 0).length}
        />
        <Stat
          label="With provider"
          value={byStatus[AppointmentStatus.WITH_DOCTOR]?.length ?? 0}
        />
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 pb-2">
          {FLOW_STATUSES.filter((s) => s !== AppointmentStatus.NO_SHOW).map((status) => (
            <div
              key={status}
              className="w-72 shrink-0 rounded-lg border bg-muted/30"
            >
              <div className="border-b px-3 py-2">
                <p className="text-sm font-medium">{APPOINTMENT_STATUS_LABEL[status]}</p>
                <p className="text-xs text-muted-foreground">
                  {(byStatus[status] ?? []).length} patient(s)
                </p>
              </div>
              <div className="space-y-2 p-2">
                {(byStatus[status] ?? []).length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">Empty</p>
                ) : (
                  (byStatus[status] ?? []).map((row) => (
                    <div key={row.id} className="rounded-md border bg-background p-3 text-sm shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/provider/patients/${row.patient.id}`}
                            className="font-medium hover:underline"
                          >
                            {formatFullName(row.patient.firstName, row.patient.lastName)}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(row.startsAt)} · {row.type.replace(/_/g, ' ')}
                          </p>
                          {row.provider ? (
                            <p className="text-xs text-muted-foreground">{row.provider.name}</p>
                          ) : null}
                          {row.location ? (
                            <p className="text-xs text-muted-foreground">{row.location.name}</p>
                          ) : null}
                        </div>
                        {row.waitMinutes != null && row.waitMinutes > 0 ? (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Clock className="h-3 w-3" />
                            {row.waitMinutes}m
                          </Badge>
                        ) : null}
                      </div>
                      {row.openInvoiceBalanceCents > 0 ? (
                        <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          Balance {money(row.openInvoiceBalanceCents)}
                        </p>
                      ) : null}
                      {canUpdateStatus ? (
                        <div className="mt-2">
                          <Select
                            disabled={pendingId === row.id}
                            value={row.status}
                            onValueChange={(v) => updateStatus(row.id, v as AppointmentStatus)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FLOW_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {APPOINTMENT_STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
