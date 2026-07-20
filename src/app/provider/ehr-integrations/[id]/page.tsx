import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { db } from '@/lib/db';
import {
  CONNECTOR_METHOD_LABELS,
  CONNECTION_STATUS_LABELS,
  EPIC_FHIR_RESOURCES,
  SYNC_DIRECTION_LABELS,
  getVendorEntry,
} from '@/lib/ehr/catalog';
import { TestConnectionButton } from '@/components/ehr/test-button';
import { SyncIntegrationButton } from '@/components/ehr/sync-button';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'EHR Integration' };

export default async function EhrIntegrationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('ehr:read');
  if (!user.organizationId) return null;
  const { id } = await params;

  const integration = await db.ehrIntegration.findUnique({
    where: { id },
    include: { syncLogs: { orderBy: { startedAt: 'desc' }, take: 20 } },
  });
  if (!integration) notFound();
  assertSameOrg(user, integration);

  const vendor = getVendorEntry(integration.vendor);
  const checklist = (integration.setupChecklist ?? []) as { label: string; done?: boolean }[];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/ehr-integrations">
          <ArrowLeft className="h-4 w-4" /> Back to integrations
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{integration.displayName}</h2>
          <p className="text-sm text-muted-foreground">{vendor?.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={statusVariant(integration.status)}>
              {CONNECTION_STATUS_LABELS[integration.status]}
            </Badge>
            <Badge variant="info">
              {CONNECTOR_METHOD_LABELS[integration.connectorMethod]}
            </Badge>
            <Badge variant="secondary">{SYNC_DIRECTION_LABELS[integration.syncDirection]}</Badge>
            {integration.sandboxOnly ? <Badge variant="warning">Sandbox only</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <TestConnectionButton id={integration.id} />
          <SyncIntegrationButton id={integration.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <Cap label="Patient sync" enabled={integration.patientSync} />
          <Cap label="Appointment sync" enabled={integration.appointmentSync} />
          <Cap label="Note export" enabled={integration.noteExport} />
          <Cap label="Prescription sync" enabled={integration.prescriptionSync} />
          <Cap label="Imaging metadata" enabled={integration.imagingMetadataSync} />
          <Cap label="Sandbox only" enabled={integration.sandboxOnly} />
        </CardContent>
      </Card>

      {integration.vendor === 'EPIC' ? (
        <Card>
          <CardHeader>
            <CardTitle>Epic on FHIR / SMART on FHIR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              Integration-ready placeholder, not connected yet. Tokens
              live in the practice&apos;s secrets vault, never in this row.
            </p>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                OAuth client (placeholder)
              </div>
              <ul className="mt-1 space-y-1 font-mono text-xs">
                <li>client_id: <span className="text-muted-foreground">vault://epic/clientId</span></li>
                <li>redirect_uri: <span className="text-muted-foreground">{`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.eyeq.ai'}/api/ehr/epic/callback`}</span></li>
                <li>scopes: <span className="text-muted-foreground">{integration.scopes.join(', ') || 'launch/patient, patient.read'}</span></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                FHIR resources mapped
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FHIR resource</TableHead>
                    <TableHead>EyeQ entity</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EPIC_FHIR_RESOURCES.map((row) => (
                    <TableRow key={row.resource}>
                      <TableCell className="font-mono text-xs">{row.resource}</TableCell>
                      <TableCell>{row.internal}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.usage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Setup checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist items.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={
                      item.done
                        ? 'inline-block h-2 w-2 rounded-full bg-emerald-500'
                        : 'inline-block h-2 w-2 rounded-full bg-muted-foreground/40'
                    }
                  />
                  <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {integration.syncLogs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No sync activity yet"
                description="Run a test connection above to capture the first envelope."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integration.syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDateTime(log.startedAt)}</TableCell>
                    <TableCell className="text-sm">{log.resourceType}</TableCell>
                    <TableCell className="text-sm">{log.direction}</TableCell>
                    <TableCell className="text-sm">
                      {log.recordsOk}/{log.recordsTotal || log.recordsOk}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === 'ok'
                            ? 'success'
                            : log.status === 'error'
                              ? 'destructive'
                              : 'info'
                        }
                      >
                        {log.status}
                      </Badge>
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

function Cap({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
      <span>{label}</span>
      <Badge variant={enabled ? 'success' : 'outline'}>{enabled ? 'Enabled' : 'Off'}</Badge>
    </div>
  );
}

function statusVariant(status: string) {
  if (status === 'CONNECTED') return 'success' as const;
  if (status === 'SANDBOX_CONNECTED') return 'info' as const;
  if (status === 'PRODUCTION_PENDING') return 'warning' as const;
  if (status === 'SYNC_ERROR') return 'destructive' as const;
  return 'outline' as const;
}
