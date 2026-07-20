'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SupportTicketStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSupportTicket } from '@/server/actions/support';

export function AdminTicketPanel({
  ticketId,
  status,
  securityConcern,
  assignees,
}: {
  ticketId: string;
  status: SupportTicketStatus;
  securityConcern: boolean;
  assignees: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nextStatus, setNextStatus] = useState(status);
  const [assigneeId, setAssigneeId] = useState<string>('none');
  const [flag, setFlag] = useState(securityConcern);
  const [resolution, setResolution] = useState('');
  const [note, setNote] = useState('');

  function save() {
    start(async () => {
      const r = await updateSupportTicket({
        ticketId,
        status: nextStatus,
        assignedToId: assigneeId === 'none' ? null : assigneeId,
        securityConcern: flag,
        resolution: resolution.trim() || null,
        internalNote: note.trim() || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Ticket updated');
      setNote('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-white/50 p-4">
      <h3 className="text-sm font-semibold">Admin controls</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={nextStatus}
            onValueChange={(v) => setNextStatus(v as SupportTicketStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SupportTicketStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assign to</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={flag} onChange={(e) => setFlag(e.target.checked)} />
        Mark security / PHI concern
      </label>
      <div className="space-y-1.5">
        <Label>Resolution (visible on close)</Label>
        <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Internal note</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </div>
      <Button onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Update ticket'}
      </Button>
    </div>
  );
}
