'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { replyThread } from '@/server/actions/messaging';
import { replyPatientMessage } from '@/server/actions/portal';
import { formatDateTime, formatFullName } from '@/lib/utils';

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderRoleAtSend: string;
  readStatus: string;
};

export type ThreadDetail = {
  id: string;
  subject: string;
  category: string;
  isInternal: boolean;
  patient?: { id: string; firstName: string; lastName: string } | null;
  messages: ThreadMessage[];
};

export function MessageThreadView({
  thread,
  variant,
  backHref,
}: {
  thread: ThreadDetail;
  variant: 'provider' | 'patient';
  backHref: string;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [pending, startTransition] = React.useTransition();

  function sendReply() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r =
        variant === 'patient'
          ? await replyPatientMessage({ threadId: thread.id, body: body.trim() })
          : await replyThread({ threadId: thread.id, body: body.trim() });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBody('');
      toast.success('Message sent');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" /> Back to inbox
        </Link>
      </Button>

      <div>
        <h2 className="text-xl font-semibold">{thread.subject}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {thread.patient ? (
            <span>
              {variant === 'provider' ? (
                <Link href={`/provider/patients/${thread.patient.id}`} className="underline">
                  {formatFullName(thread.patient.firstName, thread.patient.lastName)}
                </Link>
              ) : (
                formatFullName(thread.patient.firstName, thread.patient.lastName)
              )}
            </span>
          ) : null}
          <Badge variant="secondary">{thread.category}</Badge>
          {thread.isInternal ? <Badge variant="info">Internal</Badge> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {thread.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <ul className="space-y-3">
              {thread.messages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{m.senderRoleAtSend.replace(/_/g, ' ')}</span>
                    <span>{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t pt-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              maxLength={4000}
            />
            <Button onClick={sendReply} disabled={pending || !body.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
