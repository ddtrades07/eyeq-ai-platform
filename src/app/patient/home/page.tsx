import Link from 'next/link';
import {
  CalendarDays,
  CalendarPlus,
  MessageSquare,
  Pill,
  FileText,
  ClipboardCheck,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/utils';
import { humanizeVisitType } from '@/lib/labels/patient-facing';

export const metadata = { title: 'Home' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function PatientHome() {
  const session = await requirePortalPatient();

  const [nextAppt, unread, pendingForms, balanceCents, latestRx] = await Promise.all([
    db.appointment.findFirst({
      where: {
        patientId: session.patientId,
        organizationId: session.organizationId!,
        startsAt: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
      },
      orderBy: { startsAt: 'asc' },
    }),
    db.message.count({
      where: {
        readStatus: 'UNREAD',
        thread: {
          patientId: session.patientId,
          organizationId: session.organizationId!,
          isInternal: false,
        },
        senderRoleAtSend: { not: 'PATIENT' },
      },
    }),
    db.patientForm.count({
      where: {
        patientId: session.patientId,
        organizationId: session.organizationId!,
        status: 'PENDING',
      },
    }),
    db.patientInvoice
      .findMany({
        where: {
          patientId: session.patientId,
          organizationId: session.organizationId!,
          status: 'OPEN',
        },
        select: { totalCents: true, paidCents: true },
      })
      .then((rows) => rows.reduce((sum, i) => sum + (i.totalCents - i.paidCents), 0)),
    db.prescription.findFirst({
      where: { patientId: session.patientId, archivedAt: null },
      orderBy: { issuedAt: 'desc' },
    }),
  ]);

  const todos: { label: string; href: string; cta: string }[] = [];
  if (pendingForms > 0) {
    todos.push({
      label: `${pendingForms} form${pendingForms === 1 ? '' : 's'} to complete before your visit`,
      href: '/patient/forms',
      cta: 'Complete forms',
    });
  }
  if (unread > 0) {
    todos.push({
      label: `${unread} new message${unread === 1 ? '' : 's'} from your care team`,
      href: '/patient/messages',
      cta: 'Read messages',
    });
  }
  if (balanceCents > 0) {
    todos.push({
      label: `Balance due: ${money(balanceCents)}`,
      href: '/patient/billing',
      cta: 'View billing',
    });
  }
  if (!nextAppt) {
    todos.push({
      label: 'No upcoming visit scheduled',
      href: '/patient/book',
      cta: 'Book appointment',
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={`Welcome, ${session.firstName}.`}
        description="Here is what you need to do next."
      />

      {todos.length > 0 ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.label}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm">{todo.label}</span>
                <Link href={todo.href} className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                  {todo.cta}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You are all caught up. We will let you know here when something needs your attention.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Next appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {nextAppt ? (
              <>
                <p className="font-medium">{humanizeVisitType(nextAppt.type)}</p>
                <p className="text-muted-foreground">{formatDateTime(nextAppt.startsAt)}</p>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/patient/appointments">View details</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Nothing scheduled yet.</p>
                <Button asChild size="lg" className="w-full">
                  <Link href="/patient/book">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Book appointment
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {unread > 0 ? (
              <Badge variant="warning">{unread} new</Badge>
            ) : (
              <p className="text-muted-foreground">No new messages.</p>
            )}
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/patient/messages">Open messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/patient/prescriptions" icon={Pill} label="Prescriptions" hint={latestRx ? formatDate(latestRx.issuedAt) : undefined} />
        <QuickLink href="/patient/visits" icon={FileText} label="Visit summaries" />
        <QuickLink href="/patient/forms" icon={ClipboardCheck} label="Forms" hint={pendingForms > 0 ? `${pendingForms} pending` : undefined} />
        <QuickLink href="/patient/billing" icon={Receipt} label="Billing" hint={balanceCents > 0 ? money(balanceCents) : 'Paid up'} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Link>
  );
}
