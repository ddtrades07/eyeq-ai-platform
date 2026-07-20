'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  SupportTicketCategory,
  SupportTicketPriority,
} from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupportTicket } from '@/server/actions/support';

const CATEGORIES = Object.values(SupportTicketCategory);
const PRIORITIES = Object.values(SupportTicketPriority);

export function CreateSupportTicketForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState<SupportTicketCategory>('OTHER');
  const [priority, setPriority] = useState<SupportTicketPriority>('NORMAL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [mayContainPhi, setMayContainPhi] = useState(false);
  const [relatedPatientId, setRelatedPatientId] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createSupportTicket({
        category,
        priority,
        subject,
        description,
        mayContainPhi,
        relatedPatientId: relatedPatientId.trim() || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Support ticket submitted');
      router.push(`/provider/support/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          placeholder="Short summary of the issue"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={5}
          placeholder="What happened, what you expected, and steps to reproduce."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="patient">Related patient ID (optional)</Label>
        <Input
          id="patient"
          value={relatedPatientId}
          onChange={(e) => setRelatedPatientId(e.target.value)}
          placeholder="Only if needed for troubleshooting"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={mayContainPhi}
          onChange={(e) => setMayContainPhi(e.target.checked)}
        />
        <span>
          This ticket may include PHI. Prefer non-PHI descriptions when possible. EyeQ support
          handles PHI tickets with elevated care.
        </span>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit ticket'}
      </Button>
    </form>
  );
}
