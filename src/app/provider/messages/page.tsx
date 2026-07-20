import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const user = await requirePermission('messages:read');
  if (!user.organizationId) return null;

  const threads = await db.messageThread.findMany({
    where: { organizationId: user.organizationId, closedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      subject: true,
      category: true,
      isInternal: true,
      updatedAt: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, body: true, createdAt: true, readStatus: true, senderRoleAtSend: true },
      },
      _count: { select: { messages: { where: { readStatus: 'UNREAD' } } } },
    },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
        <p className="text-sm text-muted-foreground">
          Patient conversations and internal notes.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
        <CardContent className="p-0">
          {threads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start a thread from a patient chart to begin messaging."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {threads.map((t) => (
                <li key={t.id} className="relative px-4 py-3 hover:bg-accent/50">
                  <Link
                    href={`/provider/messages/${t.id}`}
                    className="absolute inset-0"
                    aria-label={`Open conversation: ${t.subject}`}
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {t.patient ? (
                          <Link
                            href={`/provider/patients/${t.patient.id}`}
                            className="relative z-10 hover:underline"
                          >
                            {formatFullName(t.patient.firstName, t.patient.lastName)}
                          </Link>
                        ) : (
                          <span>Internal</span>
                        )}
                        <span className="ml-2 text-muted-foreground">· {t.subject}</span>
                      </div>
                      {t.messages[0] ? (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                          {t.messages[0].body}
                        </p>
                      ) : null}
                    </div>
                    <div className="relative z-10 flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(t.updatedAt)}
                      </span>
                      <div className="flex gap-1">
                        {t.isInternal ? <Badge variant="info">Internal</Badge> : null}
                        {t._count.messages > 0 ? (
                          <Badge variant="warning">{t._count.messages} unread</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
