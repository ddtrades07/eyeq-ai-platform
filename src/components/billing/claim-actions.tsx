'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ClaimStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  validateClaim,
  submitClaim,
  recordManualClaimSubmission,
} from '@/server/actions/billing';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

type ValidationIssue = {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
};

export function ClaimActions({
  claimId,
  status,
  clearinghouseConfigured,
}: {
  claimId: string;
  status: ClaimStatus;
  clearinghouseConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [issues, setIssues] = React.useState<ValidationIssue[]>([]);
  const [canSubmit, setCanSubmit] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [externalRef, setExternalRef] = React.useState('');

  if (status !== ClaimStatus.DRAFT) return null;

  function runValidation(thenSubmit = false) {
    startTransition(async () => {
      const v = await validateClaim({ id: claimId });
      if (!v.ok) {
        toast.error(v.error);
        return;
      }
      setIssues(v.data.issues);
      setCanSubmit(v.data.canSubmit);
      if (v.data.issues.length > 0) {
        const errors = v.data.issues.filter((i) => i.severity === 'error').length;
        const warnings = v.data.issues.filter((i) => i.severity === 'warning').length;
        toast.message(`Validation: ${errors} error(s), ${warnings} warning(s)`);
      } else {
        toast.success('Claim passed validation');
      }
      if (thenSubmit && v.data.canSubmit && clearinghouseConfigured) {
        const r = await submitClaim({ id: claimId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toastWithDemoNotice('Claim submitted electronically', r.data);
        router.refresh();
      }
    });
  }

  function submitElectronic() {
    runValidation(true);
  }

  function recordManual(e: React.FormEvent) {
    e.preventDefault();
    if (!externalRef.trim()) {
      toast.error('Enter an external reference number');
      return;
    }
    startTransition(async () => {
      const r = await recordManualClaimSubmission({
        id: claimId,
        externalReference: externalRef.trim(),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toastWithDemoNotice('Claim marked as submitted externally', r.data);
      setManualOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => runValidation(false)}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
        Validate
      </Button>
      {clearinghouseConfigured ? (
        <Button size="sm" disabled={pending} onClick={submitElectronic}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit electronically
        </Button>
      ) : (
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">
              <Send className="h-4 w-4" /> Record external submission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record external claim submission</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              No clearinghouse is configured. Record the payer or clearinghouse reference after
              submitting outside EyeQ.
            </p>
            {issues.length > 0 ? (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                {issues.map((i) => (
                  <li
                    key={`${i.code}-${i.message}`}
                    className={i.severity === 'error' ? 'text-destructive' : 'text-muted-foreground'}
                  >
                    {i.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <form onSubmit={recordManual} className="space-y-3">
              <div className="space-y-1.5">
                <Label>External reference</Label>
                <Input
                  placeholder="Payer confirmation #"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => runValidation(false)}>
                  Validate first
                </Button>
                <Button type="submit" disabled={pending || !canSubmit}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
