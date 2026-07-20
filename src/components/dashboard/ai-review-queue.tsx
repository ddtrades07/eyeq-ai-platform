import Link from 'next/link';
import { FileText, ImageIcon, Mic, AlertTriangle, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AiReviewQueue } from '@/server/queries/dashboard';

const ROWS = [
  {
    key: 'notesPendingReview' as const,
    label: 'AI notes pending review',
    href: '/provider/ambient-scribe',
    icon: FileText,
    tone: 'default' as const,
  },
  {
    key: 'imagingPendingReview' as const,
    label: 'Imaging pending review',
    href: '/provider/imaging',
    icon: ImageIcon,
    tone: 'default' as const,
  },
  {
    key: 'scribeProcessing' as const,
    label: 'Scribe sessions in progress',
    href: '/provider/ambient-scribe',
    icon: Mic,
    tone: 'default' as const,
  },
  {
    key: 'highRiskImaging' as const,
    label: 'High-priority imaging observations',
    href: '/provider/imaging',
    icon: AlertTriangle,
    tone: 'destructive' as const,
  },
  {
    key: 'imagingFollowUps' as const,
    label: 'Imaging flagged for follow up',
    href: '/provider/imaging',
    icon: Flag,
    tone: 'warning' as const,
  },
];

export function AiReviewQueueCard({ queue }: { queue: AiReviewQueue }) {
  const total = Object.values(queue).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI review queue</CardTitle>
        {total === 0 ? <Badge variant="success">All clear</Badge> : <Badge variant="info">{total} pending</Badge>}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is waiting on provider review right now.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {ROWS.map((row) => {
              const count = queue[row.key];
              if (count === 0) return null;
              const Icon = row.icon;
              return (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {row.label}
                    </span>
                    <Badge
                      variant={
                        row.tone === 'destructive'
                          ? 'destructive'
                          : row.tone === 'warning'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {count}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          All AI generated content requires provider review before it is final.
        </p>
      </CardContent>
    </Card>
  );
}
