'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { completePatientForm } from '@/server/actions/portal';
import { toast } from 'sonner';

export function CompleteFormButton({ formId }: { formId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [acknowledged, setAcknowledged] = React.useState(false);

  function onComplete() {
    startTransition(async () => {
      const result = await completePatientForm({ formId, acknowledged: true });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Form completed. Thank you.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <input
          id={`ack-${formId}`}
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <Label htmlFor={`ack-${formId}`} className="text-sm font-normal leading-snug">
          I have read this form and confirm the information I provided is accurate.
        </Label>
      </div>
      <Button size="sm" onClick={onComplete} disabled={!acknowledged || pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as completed'}
      </Button>
    </div>
  );
}
