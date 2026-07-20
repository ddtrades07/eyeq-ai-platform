import { notFound } from 'next/navigation';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { MessageThreadView } from '@/components/messages/message-thread-view';

export const metadata = { title: 'Message thread' };

export default async function PatientMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await requirePortalPatient();
  const { threadId } = await params;

  const thread = await db.messageThread.findFirst({
    where: {
      id: threadId,
      patientId: session.patientId,
      isInternal: false,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!thread) notFound();

  return (
    <MessageThreadView
      variant="patient"
      backHref="/patient/messages"
      thread={{
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        isInternal: false,
        patient: thread.patient,
        messages: thread.messages.map((m) => ({
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
