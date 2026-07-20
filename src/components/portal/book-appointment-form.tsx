'use client';

import * as React from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestAppointment } from '@/server/actions/portal';
import { toast } from 'sonner';

const VISIT_TYPES = [
  { value: 'COMPREHENSIVE_EYE_EXAM', label: 'Comprehensive eye exam' },
  { value: 'CONTACT_LENS_EXAM', label: 'Contact lens exam' },
  { value: 'MEDICAL_OFFICE_VISIT', label: 'Medical eye concern' },
  { value: 'DRY_EYE_FOLLOWUP', label: 'Dry eye follow up' },
  { value: 'GLAUCOMA_FOLLOWUP', label: 'Glaucoma follow up' },
  { value: 'PEDIATRIC', label: 'Child eye exam' },
] as const;

export function BookAppointmentForm() {
  const [pending, startTransition] = React.useTransition();
  const [submitted, setSubmitted] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      visitType: String(fd.get('visitType')) as (typeof VISIT_TYPES)[number]['value'],
      preferredDate: String(fd.get('preferredDate') ?? ''),
      preferredTime: String(fd.get('preferredTime')) as 'morning' | 'afternoon' | 'no_preference',
      note: String(fd.get('note') ?? '') || undefined,
    };

    startTransition(async () => {
      const result = await requestAppointment(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
            <CalendarCheck className="h-6 w-6 text-emerald-700" />
          </span>
          <h3 className="text-lg font-semibold">Request sent</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Our team received your request. Staff will approve it by converting it
            into a confirmed appointment, or they may message you with questions.
            You can check replies on your Messages page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="visitType">What type of visit do you need?</Label>
            <select
              id="visitType"
              name="visitType"
              required
              defaultValue="COMPREHENSIVE_EYE_EXAM"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {VISIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferredDate">Preferred date</Label>
            <Input
              id="preferredDate"
              name="preferredDate"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferredTime">Preferred time of day</Label>
            <select
              id="preferredTime"
              name="preferredTime"
              defaultValue="no_preference"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="no_preference">No preference</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Anything we should know? (optional)</Label>
            <Textarea
              id="note"
              name="note"
              rows={3}
              maxLength={1000}
              placeholder="For example: new glasses, blurry vision, insurance changes"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send request'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            This sends a request to the office. Your appointment is not final
            until our team confirms it with you.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
