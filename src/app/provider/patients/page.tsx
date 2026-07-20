import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { calculateAge, formatDate, formatFullName } from '@/lib/utils';
import { hasPermission } from '@/lib/auth/rbac';
import { NewPatientDialog } from '@/components/patients/new-patient-dialog';
import { DuplicatePatientsPanel } from '@/components/patients/duplicate-patients-panel';
import { PatientMergeDialog } from '@/components/patients/patient-merge-dialog';

export const metadata = { title: 'Patients' };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission('patients:read');
  if (!user.organizationId) return null;
  const params = await searchParams;
  const q = (params.q ?? '').trim();

  const canCreate = hasPermission(user.role, 'patients:create');
  const canReviewDuplicates = hasPermission(user.role, 'patients:update');
  const canMerge = hasPermission(user.role, 'patients:merge');

  const [patients, mergeCandidates] = await Promise.all([
    db.patient.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 200,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        email: true,
        phone: true,
        insuranceCarrier: true,
        hasDiabetes: true,
        hasHypertension: true,
        hasGlaucomaPersonal: true,
        hasGlaucomaFamily: true,
        isSmoker: true,
        createdAt: true,
      },
    }),
    canMerge
      ? db.patient.findMany({
          where: { organizationId: user.organizationId, archivedAt: null },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          take: 300,
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([] as { id: string; firstName: string; lastName: string }[]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Patients</h2>
          <p className="text-sm text-muted-foreground">
            {patients.length} active patient{patients.length === 1 ? '' : 's'}.
          </p>
        </div>
        {canCreate ? <NewPatientDialog /> : null}
        {canMerge && mergeCandidates.length > 1 ? (
          <PatientMergeDialog patients={mergeCandidates} />
        ) : null}
      </div>

      {canReviewDuplicates ? <DuplicatePatientsPanel /> : null}

      <Card>
        <CardHeader>
          <form className="flex w-full max-w-sm gap-2" method="get">
            <Input name="q" defaultValue={q} placeholder="Search by name, email, phone" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <CardTitle className="sr-only">Patient directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No patients found"
                description={q ? `No results for “${q}”.` : 'Add your first patient to get started.'}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Risk factors</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => {
                  const risks: string[] = [];
                  if (p.hasDiabetes) risks.push('DM');
                  if (p.hasHypertension) risks.push('HTN');
                  if (p.hasGlaucomaPersonal) risks.push('Glaucoma');
                  if (p.hasGlaucomaFamily) risks.push('Glaucoma FH');
                  if (p.isSmoker) risks.push('Smoker');

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link href={`/provider/patients/${p.id}`} className="hover:underline">
                          {formatFullName(p.firstName, p.lastName)}
                        </Link>
                      </TableCell>
                      <TableCell>{calculateAge(p.dateOfBirth)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{p.email ?? '-'}</div>
                        <div>{p.phone ?? '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {risks.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None recorded</span>
                          ) : (
                            risks.map((r) => (
                              <Badge key={r} variant="warning">{r}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
