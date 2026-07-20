import Link from 'next/link';
import { AlertCircle, ClipboardList, FileWarning, ImageIcon, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import type { DashboardAttention } from '@/server/queries/dashboard-brain';

export function ProviderAttentionQueue({ data }: { data: DashboardAttention }) {
  const items = [
    { label: 'Imaging awaiting review', value: data.unreviewedImaging, href: '/provider/imaging', icon: ImageIcon },
    { label: 'Imaging awaiting sign-off', value: data.imagingAwaitingSignOff, href: '/provider/imaging', icon: FileWarning },
    { label: 'Unsigned notes', value: data.unsignedNotes, href: '/provider/patients', icon: ClipboardList },
    { label: 'Open care gaps', value: data.openCareGaps, href: '/provider/care-gaps', icon: AlertCircle },
    { label: 'Unread messages', value: data.unreadMessages, href: '/provider/messages', icon: MessageSquare },
  ].filter((i) => i.value > 0);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider attention queue</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No items require immediate attention.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provider attention queue</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </div>
                <Link href={item.href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  {item.value}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function WorkflowHealthCard({
  inProgress,
  noShowToday,
  imagingPending,
}: {
  inProgress: number;
  noShowToday: number;
  imagingPending: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow health</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">In progress today</div>
          <div className="text-lg font-semibold">{inProgress}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">No-shows today</div>
          <div className="text-lg font-semibold">{noShowToday}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">Imaging review backlog</div>
          <div className="text-lg font-semibold">{imagingPending}</div>
        </div>
      </CardContent>
    </Card>
  );
}
