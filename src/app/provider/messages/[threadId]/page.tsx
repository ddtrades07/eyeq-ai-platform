import { notFound } from 'next/navigation';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { MessageThreadView } from '@/components/messages/message-thread-view';
import { markThreadRead } from '@/server/actions/messaging';

export const metadata = { title: 'Message thread' };

export default async function ProviderMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await requirePermission('messages:read');
  if (!user.organizationId) return null;
  const { threadId } = await params;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      organizationId: true,
      subject: true,
      category: true,
      isInternal: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderRoleAtSend: true,
          readStatus: true,
        },
      },
    },
  });
  if (!thread) notFound();
  assertSameOrg(user, thread);

  await markThreadRead({ threadId });

  // Present oldest→newest for the loaded page window
  const messages = [...thread.messages].reverse();

  return (
    <MessageThreadView
      variant="provider"
      backHref="/provider/messages"
      thread={{
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        isInternal: thread.isInternal,
        patient: thread.patient,
        messages: messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          senderRoleAtSend: m.senderRoleAtSend ?? 'UNKNOWN',
          readStatus: m.readStatus,
        })),
      }}
    />
  );
}
