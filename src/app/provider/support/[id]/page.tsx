import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { PageHeader } from '@/components/ui/page-header';
import { AdminTicketPanel } from '@/components/support/admin-ticket-panel';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Support ticket' };

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('org:read');
  if (!user.organizationId) return null;
  const { id } = await params;
  const canManage = hasPermission(user.role, 'org:manage');

  const ticket = await db.supportTicket.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
      ...(canManage ? {} : { createdById: user.id }),
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      notes: {
        where: canManage ? undefined : { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!ticket) notFound();

  const assignees = canManage
    ? await db.user.findMany({
        where: {
          organizationId: user.organizationId,
          isActive: true,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/support">
          <ArrowLeft className="h-4 w-4" /> Back to support
        </Link>
      </Button>

      <PageHeader
        title={ticket.subject}
        description={`${ticket.category.replace(/_/g, ' ')} · ${ticket.priority} · opened ${formatDateTime(ticket.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{ticket.status.replace(/_/g, ' ')}</Badge>
            {ticket.mayContainPhi ? <Badge variant="warning">May contain PHI</Badge> : null}
            {ticket.securityConcern ? (
              <Badge variant="destructive">Security concern</Badge>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Issue</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap text-foreground">{ticket.description}</p>
            <p className="text-xs text-muted-foreground">
              Submitted by {formatFullName(ticket.createdBy.firstName, ticket.createdBy.lastName)} (
              {ticket.createdBy.email})
            </p>
            {ticket.relatedPatientId ? (
              <p className="text-xs text-muted-foreground">
                Related patient ID: {ticket.relatedPatientId}
              </p>
            ) : null}
            {ticket.resolution ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Resolution
                </div>
                <p className="mt-1 whitespace-pre-wrap text-emerald-950">{ticket.resolution}</p>
              </div>
            ) : null}
          </GlassCardContent>
        </GlassCard>

        {canManage ? (
          <AdminTicketPanel
            ticketId={ticket.id}
            status={ticket.status}
            securityConcern={ticket.securityConcern}
            assignees={assignees.map((a) => ({
              id: a.id,
              label: formatFullName(a.firstName, a.lastName),
            }))}
          />
        ) : (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Status</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              {ticket.assignedTo
                ? `Assigned to ${formatFullName(ticket.assignedTo.firstName, ticket.assignedTo.lastName)}`
                : 'Awaiting EyeQ / practice admin response.'}
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      {ticket.notes.length > 0 ? (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Notes</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            {ticket.notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border/50 bg-white/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatFullName(n.author.firstName, n.author.lastName)}
                    {n.isInternal ? ' · internal' : ''}
                  </span>
                  <span>{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </GlassCardContent>
        </GlassCard>
      ) : null}
    </div>
  );
}
