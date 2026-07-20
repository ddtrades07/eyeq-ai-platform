'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendPatientMessage } from '@/server/actions/portal';
import { toast } from 'sonner';

export function NewMessageForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      subject: String(fd.get('subject') ?? ''),
      body: String(fd.get('body') ?? ''),
      category: String(fd.get('category') ?? 'general') as
        | 'general'
        | 'clinical'
        | 'scheduling'
        | 'billing'
        | 'rx',
    };

    startTransition(async () => {
      const result = await sendPatientMessage(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Message sent. Our team will reply here.');
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Send className="mr-1 h-4 w-4" /> New message
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Message your care team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Topic</Label>
            <select
              id="category"
              name="category"
              defaultValue="general"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="general">General question</option>
              <option value="scheduling">Scheduling</option>
              <option value="rx">Prescriptions or glasses</option>
              <option value="billing">Billing</option>
              <option value="clinical">A health concern</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={4} required maxLength={4000} />
          </div>
          <p className="text-xs text-muted-foreground">
            Not for emergencies. If you have sudden vision loss or severe eye
            pain, call the office or 911 right away.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
