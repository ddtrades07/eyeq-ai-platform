import Link from 'next/link';
import { ConnectedEhrVendor } from '@prisma/client';
import { PlugZap, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { EHR_CATALOG, CONNECTION_STATUS_LABELS } from '@/lib/ehr/catalog';
import { ProvisionEhrButton } from '@/components/ehr/provision-button';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'EHR Integrations' };

export default async function EhrIntegrationsPage() {
  await requireStaffUser();
  const user = await requirePermission('ehr:read');
  if (!user.organizationId) return null;

  const integrations = await db.ehrIntegration.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  const connectedByVendor = new Map(integrations.map((i) => [i.vendor, i] as const));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">EHR Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Manage connectors to hospital and optometry EHRs. All listings below are
          integration-ready placeholders. Real connections require vendor
          approval and security review.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-sky-200/60 bg-sky-50/60 p-3 text-xs text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          EHR integrations transmit PHI. Sign a BAA with each vendor, store
          OAuth tokens in a secrets vault, and stage every connection in a
          sandbox before production cut-over.
        </p>
      </div>

      {integrations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Connected vendors</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {integrations.map((i) => (
              <Link
                key={i.id}
                href={`/provider/ehr-integrations/${i.id}`}
                className="block rounded-md border p-4 transition hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{i.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.connectorMethod.replace('_', ' ')} · {i.syncDirection.toLowerCase()}
                    </div>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Last sync: {formatDateTime(i.lastSyncAt)}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Vendor catalog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {EHR_CATALOG.map((entry) => {
            const existing = connectedByVendor.get(entry.vendor);
            return (
              <div
                key={entry.vendor}
                className="rounded-md border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <PlugZap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{entry.name}</span>
                      <Badge variant="secondary">{entry.segment}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.capabilities.patientSync ? <Badge variant="info">Patient</Badge> : null}
                      {entry.capabilities.appointmentSync ? <Badge variant="info">Appointments</Badge> : null}
                      {entry.capabilities.noteExport ? <Badge variant="info">Notes</Badge> : null}
                      {entry.capabilities.prescriptionSync ? <Badge variant="info">Rx</Badge> : null}
                      {entry.capabilities.imagingMetadataSync ? <Badge variant="info">Imaging</Badge> : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {existing ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/provider/ehr-integrations/${existing.id}`}>Manage</Link>
                      </Button>
                    ) : (
                      <ProvisionEhrButton vendor={entry.vendor as ConnectedEhrVendor} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof CONNECTION_STATUS_LABELS }) {
  const variant =
    status === 'CONNECTED' ? 'success'
    : status === 'SANDBOX_CONNECTED' ? 'info'
    : status === 'PRODUCTION_PENDING' ? 'warning'
    : status === 'SYNC_ERROR' ? 'destructive'
    : 'outline';
  return <Badge variant={variant}>{CONNECTION_STATUS_LABELS[status]}</Badge>;
}
