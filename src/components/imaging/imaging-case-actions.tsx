'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flag, FlagOff, GitCompare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { markImagingFollowUp } from '@/server/actions/imaging';

export function ImagingCaseActions({
  caseId, needsFollowUp, followUpNote, priorCaseId, canReview,
}: {
  caseId: string;
  needsFollowUp: boolean;
  followUpNote: string | null;
  priorCaseId: string | null;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [showNote, setShowNote] = React.useState(false);
  const [note, setNote] = React.useState(followUpNote ?? '');

  function submit(nextValue: boolean) {
    startTransition(async () => {
      const r = await markImagingFollowUp({
        id: caseId,
        needsFollowUp: nextValue,
        note: nextValue ? note.trim() || null : null,
      });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(nextValue ? 'Marked as needs follow up' : 'Follow up flag removed');
      setShowNote(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canReview && (
          needsFollowUp ? (
            <Button size="sm" variant="outline" onClick={() => submit(false)} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlagOff className="h-4 w-4" />}
              Remove follow up flag
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowNote((v) => !v)} disabled={pending}>
              <Flag className="h-4 w-4" /> Mark as Needs Follow Up
            </Button>
          )
        )}
        {priorCaseId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/provider/imaging/${caseId}/compare`}>
              <GitCompare className="h-4 w-4" /> Compare With Prior Scan
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled title="No prior scan of this type for this patient">
            <GitCompare className="h-4 w-4" /> Compare With Prior Scan
          </Button>
        )}
      </div>

      {needsFollowUp && followUpNote ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Follow up note: {followUpNote}
        </p>
      ) : null}

      {showNote && !needsFollowUp && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="text-xs font-medium">Follow up note (optional)</label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for follow up"
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowNote(false)}>Cancel</Button>
            <Button size="sm" onClick={() => submit(true)} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
