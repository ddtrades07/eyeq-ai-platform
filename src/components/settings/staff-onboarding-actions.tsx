'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { completeOnboardingStep, ensureStaffOnboarding } from '@/server/actions/staff-onboarding';

const STEPS = [
  { step: 'inviteAccepted' as const, label: 'Mark invite accepted' },
  { step: 'passwordSet' as const, label: 'Mark password set' },
  { step: 'mfaEnrolled' as const, label: 'Mark MFA enrolled' },
  { step: 'roleConfirmed' as const, label: 'Confirm role' },
  { step: 'locationAccessConfirmed' as const, label: 'Confirm locations' },
  { step: 'permissionsReviewed' as const, label: 'Confirm permissions' },
  { step: 'phiNoticeAccepted' as const, label: 'Accept PHI notice' },
  { step: 'workflowIntroCompleted' as const, label: 'Complete workflow intro' },
];

export function StaffOnboardingActions({
  userId,
  isSelf,
  mfaRequired,
}: {
  userId: string;
  isSelf: boolean;
  mfaRequired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    void ensureStaffOnboarding({ userId });
  }, [userId]);

  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.filter((s) => !(s.step === 'mfaEnrolled' && !mfaRequired && !isSelf)).map((s) => (
        <Button
          key={s.step}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await completeOnboardingStep({ userId, step: s.step });
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              toast.success(s.label);
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {s.label}
        </Button>
      ))}
    </div>
  );
}
