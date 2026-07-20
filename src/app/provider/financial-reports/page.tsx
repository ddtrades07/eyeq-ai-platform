import { LineChart, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { getFinancialReport } from '@/server/queries/financial';
import { FinancialFilters } from '@/components/financial/filters';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { resolveActiveLocationId } from '@/lib/location/server';

export const metadata = { title: 'Financial reports' };

export const dynamic = 'force-dynamic';

type Search = {
  periodStart?: string;
  periodEnd?: string;
  locationId?: string;
  providerId?: string;
  appointmentType?: string;
};

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireStaffUser();
  await requirePermission('finance:read');
  if (!user.organizationId) return null;

  const sp = await searchParams;
  const now = new Date();
  const periodStart = sp.periodStart
    ? new Date(sp.periodStart)
    : new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const periodEnd = sp.periodEnd
    ? new Date(sp.periodEnd)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const activeLocationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const [report, locations, providers] = await Promise.all([
    getFinancialReport(user.organizationId, {
      periodStart,
      periodEnd,
      locationId: sp.locationId ?? activeLocationId ?? null,
      providerId: sp.providerId ?? null,
      appointmentType: sp.appointmentType ?? null,
    }),
    db.location.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    db.provider.findMany({
      where: { organizationId: user.organizationId },
      include: { user: true },
      orderBy: { user: { lastName: 'asc' } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Financial reports</h2>
        <p className="text-sm text-muted-foreground">
          Operational + revenue-opportunity reporting for owners and admins.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-sky-200/60 bg-sky-50/60 p-3 text-xs text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          These reports surface practice-level operations. EyeQ AI does not
          attribute revenue to individual providers; provider-level workload is
          shown instead. Access is limited to Owner / Admin roles.
        </p>
      </div>

      <FinancialFilters
        periodStart={periodStart.toISOString().slice(0, 10)}
        periodEnd={periodEnd.toISOString().slice(0, 10)}
        locationId={sp.locationId}
        providerId={sp.providerId}
        appointmentType={sp.appointmentType}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        providers={providers.map((p) => ({
          id: p.id,
          name: `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim() || 'Provider',
        }))}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scheduled appts" value={formatNumber(report.appointmentVolume.scheduled)} />
        <Stat
          label="Completed"
          value={formatNumber(report.appointmentVolume.completed)}
          sub={formatPercent(report.appointmentVolume.completionRate)}
        />
        <Stat
          label="No-show"
          value={formatNumber(report.appointmentVolume.noShow)}
          sub={formatPercent(report.appointmentVolume.noShowRate)}
          tone="warn"
        />
        <Stat label="Cancelled" value={formatNumber(report.appointmentVolume.cancelled)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Recall &amp; care-gap conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Care gaps created" value={formatNumber(report.recall.careGapsTotal)} />
            <Row label="Resolved / booked" value={formatNumber(report.recall.careGapsResolved)} />
            <Row label="Leakage (unresolved)" value={formatNumber(report.recall.careGapsLeakage)} />
            <Row label="Conversion rate" value={formatPercent(report.recall.conversionRate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-primary" /> Inventory exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Active SKUs" value={formatNumber(report.inventory.totalSkus)} />
            <Row label="Inventory value (at cost)" value={formatCurrency(report.inventory.inventoryCostCents)} />
            <Row label="Inventory value (at retail)" value={formatCurrency(report.inventory.inventoryRetailCents)} />
            <Row label="Low / OOS SKUs" value={formatNumber(report.inventory.lowStockSkus)} />
            <Row
              label="Reorder cost risk"
              value={formatCurrency(report.inventory.lowStockReorderCostCents)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient retention</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Active patients in period" value={formatNumber(report.retention.patientsActive)} />
            <Row label="Returning (completed visit)" value={formatNumber(report.retention.patientsReturning)} />
            <Row label="Retention rate" value={formatPercent(report.retention.retentionRate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Optical hand-off</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Appointments completed" value={formatNumber(report.optical.appointmentsWithHandoff)} />
            <Row label="Optical handoffs pending" value={formatNumber(report.optical.handoffsPending)} />
            <Row label="Hand-off rate" value={formatPercent(report.optical.handoffRate)} />
            <p className="text-[11px] text-muted-foreground">
              Optical conversion placeholder. Integrate POS or order data for
              true conversion.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider workload (no per-provider revenue)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Completed visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.workload.map((w) => (
                <TableRow key={w.providerId}>
                  <TableCell>{w.providerName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(w.completedAppointments)}
                  </TableCell>
                </TableRow>
              ))}
              {report.workload.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    No completed visits in period.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Appointments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.locations.map((l) => (
                <TableRow key={l.locationId}>
                  <TableCell>{l.locationName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(l.appointments)}
                  </TableCell>
                </TableRow>
              ))}
              {report.locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    No appointment data.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue opportunity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row
            label="Glasses / CL Rx expiring next 90 days"
            value={formatNumber(report.revenueOpportunity.expiringRxNext90Days)}
          />
          <Row
            label="Overdue annual exams (care gap)"
            value={formatNumber(report.revenueOpportunity.overdueAnnualExams)}
          />
          <p className="text-[11px] text-muted-foreground">
            {report.revenueOpportunity.estimatedOpportunity}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn' | 'good';
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {sub ? (
          <div
            className={
              tone === 'warn'
                ? 'text-xs font-medium text-amber-600'
                : tone === 'good'
                  ? 'text-xs font-medium text-emerald-600'
                  : 'text-xs text-muted-foreground'
            }
          >
            {sub}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
