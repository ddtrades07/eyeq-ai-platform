'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { createReminderTemplate, generateReminderBody } from '@/server/actions/reminders';
import {
  REMINDER_CHANNEL_LABELS,
  REMINDER_TYPE_LABELS,
} from '@/lib/reminders/catalog';
import type { ReminderChannel, ReminderType, SupportedLocale } from '@prisma/client';
import { LOCALE_LABELS, toPrismaLocale, type Locale } from '@/lib/i18n/config';

export function NewTemplateDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<ReminderType>('APPOINTMENT_REMINDER');
  const [channel, setChannel] = React.useState<ReminderChannel>('SMS');
  const [locale, setLocale] = React.useState<SupportedLocale>('EN');
  const [body, setBody] = React.useState('');
  const [pending, startTransition] = React.useTransition();

  function aiFill() {
    startTransition(async () => {
      const r = await generateReminderBody({
        type,
        channel,
        locale,
        practiceName: 'Your Practice',
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBody(r.data.body);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createReminderTemplate({
        type,
        channel,
        locale,
        name: String(f.get('name') ?? ''),
        subject: String(f.get('subject') ?? '') || null,
        body,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Template created');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New reminder template</DialogTitle>
          <DialogDescription>
            Keep messages PHI-safe. Use variables like <code>{`{{firstName}}`}</code>.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REMINDER_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ReminderChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REMINDER_CHANNEL_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Locale</Label>
              <Select
                value={locale}
                onValueChange={(v) => setLocale(toPrismaLocale(v.toLowerCase() as Locale))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOCALE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code.toUpperCase()}>
                      {label.native}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {channel === 'EMAIL' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message *</Label>
              <Button type="button" size="sm" variant="ghost" onClick={aiFill} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI fill
              </Button>
            </div>
            <Textarea id="body" name="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !body.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
