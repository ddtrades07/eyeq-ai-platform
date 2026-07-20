import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';
import { NewOpticalQuoteDialog } from '@/components/optical/new-optical-quote-dialog';

export const metadata = { title: 'Optical' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function OpticalPage() {
  const user = await requirePermission('optical:read');
  const organizationId = user.organizationId!;
  const canSell = hasPermission(user.role, 'optical:sell');

  const [orders, patients, labs, inventory] = await Promise.all([
    db.opticalOrder.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        lab: { select: { name: true } },
      },
    }),
    canSell
      ? db.patient.findMany({
          where: { organizationId, archivedAt: null },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          take: 200,
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
    canSell
      ? db.opticalLab.findMany({
          where: { organizationId, active: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    canSell
      ? db.inventoryItem.findMany({
          where: { organizationId, status: 'ACTIVE', archivedAt: null },
          take: 100,
          select: { id: true, name: true, retailCents: true },
        })
      : Promise.resolve([]),
  ]);

  const inProgress = orders.filter(
    (o) => !['DISPENSED', 'CANCELLED', 'RETURNED'].includes(o.status),
  ).length;
  const ready = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Optical point of sale</h1>
          <p className="text-sm text-muted-foreground">
            Quotes, lab orders, pickup, and dispense with inventory adjustment.
          </p>
        </div>
        {canSell && patients.length > 0 ? (
          <NewOpticalQuoteDialog patients={patients} labs={labs} inventory={inventory} />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Orders in progress" value={inProgress} />
        <Stat label="Ready for pickup" value={ready} />
        <Stat label="Active labs" value={labs.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optical orders</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {orders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No optical orders yet.</p>
          ) : (
            orders.map((o) => (
              <Link
                key={o.id}
                href={`/provider/optical/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">
                    {formatFullName(o.patient.firstName, o.patient.lastName)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.type.replace(/_/g, ' ')} · {formatDate(o.createdAt)}
                    {o.lab ? ` · ${o.lab.name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{o.status.replace(/_/g, ' ')}</Badge>
                  <span className="font-semibold">{money(o.patientRespCents)}</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
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
