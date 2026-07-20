'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { submitProviderVerification } from '@/server/actions/imaging';

export function ProviderVerificationDialog({
  imagingCaseId,
  disabled,
}: {
  imagingCaseId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agrees, setAgrees] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [referral, setReferral] = useState(false);
  const [approveSummary, setApproveSummary] = useState(false);
  const [trend, setTrend] = useState<string>('baseline');
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (agrees === null) {
      toast.error('Please indicate whether you agree or disagree with the AI image analysis.');
      return;
    }
    startTransition(async () => {
      const r = await submitProviderVerification({
        id: imagingCaseId,
        agrees,
        providerNote: note || null,
        patientSummary: summary || null,
        followUpPlan: followUp || null,
        referralNeeded: referral,
        approvePatientSummary: approveSummary && Boolean(summary.trim()),
        trend: trend as 'baseline',
      });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success('Provider verification recorded');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <FileText className="h-4 w-4" /> Provider verification
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Provider interpretation</DialogTitle>
          <DialogDescription>
            Separate AI-generated analysis (draft only, not a diagnosis) from your final
            interpretation. Provider sign-off is required before clinical use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agree / Disagree */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Do you accept, edit context for, or reject these possible AI observations?
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={agrees === true ? 'default' : 'outline'}
                onClick={() => setAgrees(true)}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Accept
              </Button>
              <Button
                size="sm"
                variant={agrees === false ? 'destructive' : 'outline'}
                onClick={() => setAgrees(false)}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>

          {/* Trend */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Trend assessment</label>
            <select
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="baseline">Baseline</option>
              <option value="stable">Stable</option>
              <option value="improved">Improved</option>
              <option value="subtle-change">Subtle change</option>
              <option value="concern-noted">Concern noted</option>
            </select>
          </div>

          {/* Provider note */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provider note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              placeholder="Additional clinical observations..."
            />
          </div>

          {/* Patient summary */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Provider-approved patient summary (optional)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              placeholder="Brief summary safe to share with patient..."
            />
          </div>

          {/* Follow-up */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Follow-up plan</label>
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={1}
              placeholder="e.g., Repeat OCT in 6 months..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={approveSummary}
              onChange={(e) => setApproveSummary(e.target.checked)}
              className="rounded border-gray-300"
            />
            Approve patient summary for portal (requires summary text)
          </label>

          {/* Referral */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={referral}
              onChange={(e) => setReferral(e.target.checked)}
              className="rounded border-gray-300"
            />
            Referral needed
          </label>

          <Button onClick={handleSubmit} disabled={pending} className="w-full gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit verification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
