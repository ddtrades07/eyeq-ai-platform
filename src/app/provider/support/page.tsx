import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CreateSupportTicketForm } from '@/components/support/create-ticket-form';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Support' };

export default async function SupportPage() {
  const user = await requirePermission('org:read');
  if (!user.organizationId) return null;
  const canManage = hasPermission(user.role, 'org:manage');

  const tickets = await db.supportTicket.findMany({
    where: {
      organizationId: user.organizationId,
      ...(canManage ? {} : { createdById: user.id }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Submit practice issues to EyeQ. Mark PHI carefully. Clinical care is never blocked by billing or support status."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>New ticket</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <CreateSupportTicketForm />
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>{canManage ? 'All practice tickets' : 'Your tickets'}</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {tickets.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title="No support tickets yet"
                description="Use this queue for login, MFA, scheduling, charting, AI, messaging, billing, and launch issues."
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-border/50">
                {tickets.map((t) => (
                  <li key={t.id} className="py-3">
                    <Link
                      href={`/provider/support/${t.id}`}
                      className="flex items-start justify-between gap-3 hover:opacity-90"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.subject}</div>
                        <p className="text-xs text-muted-foreground">
                          {t.category.replace(/_/g, ' ')} ·{' '}
                          {formatFullName(t.createdBy.firstName, t.createdBy.lastName)} ·{' '}
                          {formatDateTime(t.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary">{t.status.replace(/_/g, ' ')}</Badge>
                        {t.mayContainPhi ? (
                          <Badge variant="warning" className="text-[10px]">
                            May contain PHI
                          </Badge>
                        ) : null}
                        {t.securityConcern ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Security flag
                          </Badge>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {canManage ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Owners/admins can assign, add internal notes, and close tickets.
              </p>
            ) : null}
            <Link
              href="/provider/settings"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-2' })}
            >
              Back to settings
            </Link>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
