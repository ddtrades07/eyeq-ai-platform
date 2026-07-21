'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { setOrganizationMfaRequired } from '@/server/actions/mfa';

export function OrgMfaPolicyForm({
  required,
  providerConfigured,
}: {
  required: boolean;
  providerConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [value, setValue] = React.useState(required);

  function save(next: boolean) {
    startTransition(async () => {
      const r = await setOrganizationMfaRequired({ required: next });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setValue(next);
      toast.success(next ? 'MFA is now required for staff' : 'MFA requirement removed');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        When enabled, clinical users cannot access PHI areas until MFA enrollment and AAL2
        challenge succeed. Demo org soft-gates; production orgs hard-block.
      </p>
      {!providerConfigured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          MFA provider not configured: you cannot require MFA until Supabase Auth is set.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={value ? 'default' : 'outline'}
          disabled={pending || !providerConfigured}
          onClick={() => save(true)}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Require MFA for staff
        </Button>
        <Button
          size="sm"
          variant={!value ? 'default' : 'outline'}
          disabled={pending}
          onClick={() => save(false)}
        >
          Do not require MFA
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Current policy: <strong>{value ? 'Required' : 'Not required'}</strong>
      </p>
    </div>
  );
}
