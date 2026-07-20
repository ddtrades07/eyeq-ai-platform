import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';
import { OpticalOrderActions } from '@/components/optical/optical-order-actions';

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function OpticalOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('optical:read');
  const organizationId = user.organizationId!;
  const { id } = await params;

  const order = await db.opticalOrder.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      lab: true,
      items: true,
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order || order.organizationId !== organizationId) notFound();

  const canAdvance =
    hasPermission(user.role, 'optical:order') || hasPermission(user.role, 'optical:dispense');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/provider/optical" className="text-sm text-primary hover:underline">
          Optical
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatFullName(order.patient.firstName, order.patient.lastName)} · {order.type.replace(/_/g, ' ')}
        </h1>
        <p className="text-sm text-muted-foreground">
          Status: {order.status.replace(/_/g, ' ')} · Balance {money(order.balanceCents)}
        </p>
      </div>

      {canAdvance ? (
        <OpticalOrderActions
          orderId={order.id}
          status={order.status}
          balanceCents={order.balanceCents}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Subtotal</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{money(order.subtotalCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Insurance allowance</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {money(order.insuranceAllowanceCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Patient responsibility</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{money(order.patientRespCents)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2">
              <span>
                {item.kind.replace(/_/g, ' ')} · {item.description} × {item.quantity}
              </span>
              <span>{money(item.unitPriceCents * item.quantity)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.statusEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <Badge variant="outline">{e.status.replace(/_/g, ' ')}</Badge>
              <span className="text-muted-foreground">{formatDate(e.createdAt)}</span>
              {e.note ? <span>{e.note}</span> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {order.lab ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lab</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{order.lab.name}</p>
            {order.labOrderNumber ? <p>Order #: {order.labOrderNumber}</p> : null}
            {order.trackingNumber ? <p>Tracking: {order.trackingNumber}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
