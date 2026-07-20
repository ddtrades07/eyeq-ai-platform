import Link from 'next/link';
import {
  AlertTriangle,
  ClipboardList,
  FileCheck2,
  ImageIcon,
  MessageSquare,
  Mic,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffTaskPanel } from '@/components/tasks/staff-task-panel';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { CareGapStatus } from '@prisma/client';

export const metadata = { title: 'Tasks' };

type TaskItem = {
  label: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default async function TasksPage() {
  const user = await requirePermission('tasks:read');
  const organizationId = user.organizationId!;

  const [
    highRiskImaging,
    imagingPending,
    notesPending,
    scribeActive,
    careGapsOverdue,
    careGapsDue,
    unreadMessages,
    staffTasks,
  ] = await Promise.all([
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        signedAt: null,
        aiUrgency: { in: ['same-day', 'urgent-referral'] },
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        studyStatus: { in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE'] },
      },
    }),
    db.ambientScribeSession.count({
      where: { organizationId, reviewStatus: 'READY_FOR_REVIEW', archivedAt: null },
    }),
    db.ambientScribeSession.count({
      where: {
        organizationId,
        status: { in: ['RECORDING', 'TRANSCRIBING'] },
        archivedAt: null,
      },
    }),
    db.careGap.count({
      where: { organizationId, status: CareGapStatus.OVERDUE },
    }),
    db.careGap.count({
      where: { organizationId, status: { in: [CareGapStatus.DUE, CareGapStatus.CONTACTED] } },
    }),
    db.message.count({
      where: {
        readStatus: 'UNREAD',
        thread: { organizationId },
        senderRoleAtSend: 'PATIENT',
      },
    }),
    db.staffTask.findMany({
      where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
      take: 50,
    }),
  ]);

  const canReview = hasPermission(user.role, 'notes:sign') || hasPermission(user.role, 'imaging:review');

  const high: TaskItem[] = [
    { label: 'High-priority imaging observations to review', count: highRiskImaging, href: '/provider/imaging', icon: AlertTriangle },
    { label: 'Overdue care gaps', count: careGapsOverdue, href: '/provider/care-gaps', icon: ClipboardList },
  ].filter((t) => t.count > 0);

  const medium: TaskItem[] = [
    ...(canReview
      ? [
          { label: 'AI scribe notes awaiting approval', count: notesPending, href: '/provider/ambient-scribe', icon: FileCheck2 },
          { label: 'Imaging studies awaiting provider review', count: imagingPending, href: '/provider/imaging', icon: ImageIcon },
        ]
      : []),
    { label: 'Patient messages needing a response', count: unreadMessages, href: '/provider/messages', icon: MessageSquare },
  ].filter((t) => t.count > 0);

  const routine: TaskItem[] = [
    { label: 'Care gaps due for outreach', count: careGapsDue, href: '/provider/care-gaps', icon: ClipboardList },
    { label: 'Scribe sessions in progress', count: scribeActive, href: '/provider/ambient-scribe', icon: Mic },
  ].filter((t) => t.count > 0);

  const queueEmpty = high.length === 0 && medium.length === 0 && routine.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Staff assignments and workflow queues for your practice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTaskPanel
            tasks={staffTasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              dueAt: t.dueAt,
              patientId: t.patientId,
              patientName: t.patient
                ? `${t.patient.firstName} ${t.patient.lastName}`
                : undefined,
            }))}
          />
        </CardContent>
      </Card>

      {queueEmpty ? (
        <EmptyState
          icon={CheckCircle2}
          title="Workflow queues clear"
          description="No automated priority items right now."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <TaskGroup title="High priority" badgeVariant="destructive" items={high} />
          <TaskGroup title="Needs attention" badgeVariant="warning" items={medium} />
          <TaskGroup title="Routine" badgeVariant="secondary" items={routine} />
        </div>
      )}
    </div>
  );
}

function TaskGroup({
  title,
  items,
  badgeVariant,
}: {
  title: string;
  items: TaskItem[];
  badgeVariant: 'destructive' | 'warning' | 'secondary';
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </span>
                <Badge variant={badgeVariant}>{item.count}</Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
