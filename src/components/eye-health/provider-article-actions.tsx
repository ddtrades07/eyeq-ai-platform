'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  recommendEyeHealthArticle,
  setEyeHealthArticleOrgStatus,
} from '@/server/actions/eye-health';
import type { EyeHealthOrgReviewStatus } from '@prisma/client';

export function RecommendArticleForm({
  slug,
  patients,
}: {
  slug: string;
  patients: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = React.useState(patients[0]?.id ?? '');
  const [pending, startTransition] = React.useTransition();

  function recommend(sendMessage: boolean) {
    if (!patientId) {
      toast.error('Select a patient');
      return;
    }
    startTransition(async () => {
      const r = await recommendEyeHealthArticle({
        patientId,
        slug,
        sendMessage,
        context: 'PROVIDER_RECOMMENDED',
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        sendMessage
          ? 'Article recommended and sent to the patient portal messages'
          : 'Article recommended for the patient portal',
      );
      router.refresh();
    });
  }

  if (!patients.length) {
    return <p className="text-xs text-muted-foreground">No patients available to recommend to.</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Recommend to patient</p>
      <p className="text-xs text-muted-foreground">
        Portal wording: “Your provider shared this article because it may relate to your visit.”
        Never auto-claims a diagnosis.
      </p>
      <div className="space-y-1">
        <Label htmlFor="eye-health-patient">Patient</Label>
        <select
          id="eye-health-patient"
          className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => recommend(false)}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Attach to portal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => recommend(true)}
        >
          <Send className="h-4 w-4" />
          Send secure message
        </Button>
      </div>
    </div>
  );
}

export function ApproveArticleControls({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  if (!canManage) return null;

  function setStatus(reviewStatus: EyeHealthOrgReviewStatus) {
    startTransition(async () => {
      const r = await setEyeHealthArticleOrgStatus({ slug, reviewStatus });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Article status updated');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setStatus('PROVIDER_REVIEWED')}
      >
        Mark provider reviewed
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => setStatus('PRACTICE_APPROVED')}
      >
        Mark practice approved
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => setStatus('HIDDEN')}
      >
        Hide for patients
      </Button>
    </div>
  );
}

export function QuickRecommendByPatientId({
  patientId,
  slug,
  label,
}: {
  patientId: string;
  slug: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await recommendEyeHealthArticle({
            patientId,
            slug,
            context: 'RELATED_TO_VISIT',
          });
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success(`Shared “${label}” with patient portal`);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      Share: {label}
    </Button>
  );
}
