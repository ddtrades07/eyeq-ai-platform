'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  markAuditVerified,
  markRlsVerified,
  setOrganizationLivePhi,
} from '@/server/actions/phi-readiness';

export function PhiReadinessActions({
  livePhiEnabled,
  canEnableLivePhi,
  rlsVerified,
  auditVerified,
}: {
  livePhiEnabled: boolean;
  canEnableLivePhi: boolean;
  rlsVerified: boolean;
  auditVerified: boolean;
  mfaRequired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admin actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run('RLS verification updated', () => markRlsVerified({ verified: !rlsVerified }))
          }
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {rlsVerified ? 'Clear RLS verified' : 'Mark RLS verified'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run('Audit verification updated', () => markAuditVerified({ verified: !auditVerified }))
          }
        >
          {auditVerified ? 'Clear audit verified' : 'Mark audit verified'}
        </Button>
        <Button
          size="sm"
          disabled={pending || (!livePhiEnabled && !canEnableLivePhi)}
          onClick={() =>
            run(
              livePhiEnabled ? 'Live PHI disabled' : 'Live PHI enabled',
              () => setOrganizationLivePhi({ enabled: !livePhiEnabled }),
            )
          }
        >
          {livePhiEnabled ? 'Disable live PHI' : 'Enable live PHI'}
        </Button>
        {!canEnableLivePhi && !livePhiEnabled ? (
          <p className="w-full text-xs text-muted-foreground">
            Enable is blocked until readiness checks pass (production env, MFA policy, RLS,
            BAAs, audit).
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
