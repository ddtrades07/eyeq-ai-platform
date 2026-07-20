'use client';

import * as React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MfaEnrollmentPanel } from '@/components/settings/mfa-enrollment-panel';
import { OrgMfaPolicyForm } from '@/components/settings/org-mfa-policy-form';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { recordMfaChallengePassed } from '@/server/actions/mfa';

type Assurance = {
  providerConfigured: boolean;
  currentLevel: string;
  enrolled: boolean;
};

export function MfaRequiredPanel({
  reason,
  assurance,
  canManageOrg = false,
}: {
  reason?: string;
  assurance: Assurance;
  canManageOrg?: boolean;
}) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const needsEnroll = reason === 'mfa_enrollment_required' || !assurance.enrolled;

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === 'verified');
      if (totp) setFactorId(totp.id);
    })();
  }, [supabase]);

  async function verifyChallenge() {
    if (!factorId || !code.trim()) return;
    setPending(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;
      const synced = await recordMfaChallengePassed({});
      if (!synced.ok) throw new Error(synced.error);
      toast.success('MFA verified');
      window.location.href = '/provider/dashboard';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'MFA verification failed');
    } finally {
      setPending(false);
    }
  }

  if (!assurance.providerConfigured) {
    return (
      <Card className="mx-auto max-w-lg border-amber-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-600" /> MFA provider not configured
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This organization requires MFA, but the MFA provider is not configured.
            PHI access stays blocked — EyeQ does not pretend MFA is active.
          </p>
          <p>
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then enroll staff.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-600" /> MFA required for PHI access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {needsEnroll
              ? 'Enroll an authenticator app before accessing clinical data.'
              : 'Enter your authenticator code to continue (AAL2).'}
          </p>

          {needsEnroll || !factorId ? (
            <MfaEnrollmentPanel />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mfa-challenge">Verification code</Label>
                <Input
                  id="mfa-challenge"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>
              <Button onClick={verifyChallenge} disabled={pending || code.trim().length < 6}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify and continue
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Without a successful MFA challenge, clinical routes remain blocked.
          </p>
        </CardContent>
      </Card>

      {canManageOrg ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency policy (owners/admins)</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgMfaPolicyForm required providerConfigured={assurance.providerConfigured} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
