import { Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Prescriptions' };

export default async function PortalPrescriptions() {
  const session = await requirePortalPatient();
  const rxs = await db.prescription.findMany({
    where: { patientId: session.patientId, archivedAt: null },
    orderBy: { issuedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Prescriptions</h2>
        <p className="text-sm text-muted-foreground">
          Glasses and contact lens prescriptions issued by your provider.
        </p>
      </div>

      {rxs.length === 0 ? (
        <EmptyState icon={Pill} title="No prescriptions on file" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rxs.map((rx) => {
            const expired = rx.expiresAt < new Date();
            return (
              <Card key={rx.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{rx.type === 'GLASSES' ? 'Glasses' : 'Contacts'}</span>
                    <Badge variant={expired ? 'destructive' : 'success'}>
                      {expired ? 'Expired' : 'Active'}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Issued {formatDate(rx.issuedAt)} · expires {formatDate(rx.expiresAt)}
                    {rx.providerName ? ` · ${rx.providerName}` : ''}
                  </p>
                </CardHeader>
                <CardContent className="text-sm">
                  {rx.type === 'GLASSES' ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left">Eye</th>
                          <th>Sph</th>
                          <th>Cyl</th>
                          <th>Axis</th>
                          <th>Add</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>OD</td>
                          <td>{rx.odSphere ?? '-'}</td>
                          <td>{rx.odCyl ?? '-'}</td>
                          <td>{rx.odAxis ?? '-'}</td>
                          <td>{rx.odAdd ?? '-'}</td>
                        </tr>
                        <tr>
                          <td>OS</td>
                          <td>{rx.osSphere ?? '-'}</td>
                          <td>{rx.osCyl ?? '-'}</td>
                          <td>{rx.osAxis ?? '-'}</td>
                          <td>{rx.osAdd ?? '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="space-y-1">
                      <p>Modality: {rx.modality ?? '-'}</p>
                      <p>OD: {rx.odBrand ?? '-'} {rx.odPower ?? ''}</p>
                      <p>OS: {rx.osBrand ?? '-'} {rx.osPower ?? ''}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
