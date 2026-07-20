import { Users, Shield } from 'lucide-react';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatDate } from '@/lib/utils';
import { InviteDialog } from '@/components/team/invite-dialog';
import { MemberRowActions } from '@/components/team/member-row-actions';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  const user = await requireStaffUser();
  await requirePermission('users:manage');
  if (!user.organizationId) return null;

  const members = await db.user.findMany({
    where: { organizationId: user.organizationId, role: { not: Role.PATIENT } },
    orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    include: { provider: true },
  });

  const activeCount = members.filter((m) => m.isActive).length;
  const providerCount = members.filter(
    (m) =>
      m.role === Role.OPTOMETRIST ||
      m.role === Role.MD ||
      m.role === Role.RESIDENT,
  ).length;
  const inviterIsOwner = user.role === Role.OWNER;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">
            Invite teammates and assign roles. Each role unlocks a different
            dashboard and permission set.
          </p>
        </div>
        <InviteDialog inviterIsOwner={inviterIsOwner} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Active teammates
              </div>
              <div className="text-2xl font-semibold">{activeCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Providers (OD / MD / Resident)
              </div>
              <div className="text-2xl font-semibold">{providerCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Total roster
            </div>
            <div className="text-2xl font-semibold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              Includes deactivated accounts (history preserved for audit).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No teammates yet"
                description="Invite your first teammate to give them a role-based dashboard."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teammate</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const display =
                    [m.firstName, m.lastName].filter(Boolean).join(' ') ||
                    m.email;
                  const isSelf = m.id === user.id;
                  return (
                    <TableRow key={m.id} className={m.isActive ? '' : 'opacity-60'}>
                      <TableCell>
                        <div className="font-medium">
                          {display}{' '}
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </div>
                        {m.provider?.credentials ? (
                          <div className="text-xs text-muted-foreground">
                            {m.provider.credentials}
                            {m.provider.npi ? ` · NPI ${m.provider.npi}` : ''}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="outline">Deactivated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.lastSeenAt ? formatDate(m.lastSeenAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <MemberRowActions
                          id={m.id}
                          email={m.email}
                          currentRole={m.role}
                          active={m.isActive}
                          isSelf={isSelf}
                          inviterIsOwner={inviterIsOwner}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How role-based access works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Every teammate sees a dashboard scoped to their role. Front desk
            sees scheduling + check-ins, technicians see pretest and imaging
            upload, providers see their chart queue, and owners see the full
            practice picture including financials.
          </p>
          <p>
            Sign-in URL for teammates:{' '}
            <code className="rounded bg-muted px-1 py-0.5">/login</code>. They
            should change their temporary password on first sign-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
