import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { NewMessageForm } from '@/components/portal/new-message-form';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Messages' };

export default async function PortalMessages() {
  const session = await requirePortalPatient();
  const threads = await db.messageThread.findMany({
    where: { patientId: session.patientId, isInternal: false },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Conversations with your care team.
          </p>
        </div>
      </div>

      <NewMessageForm />

      {threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Send a message and your care team will reply here."
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {threads.map((t) => (
                <li key={t.id} className="px-4 py-3 hover:bg-accent/50">
                  <Link href={`/patient/messages/${t.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.subject}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(t.updatedAt)}
                    </span>
                  </div>
                  {t.messages[0] ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.messages[0].body}
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">{t.category}</Badge>
                  </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
