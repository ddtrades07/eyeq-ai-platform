'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaEnrollmentPanel() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [enrolled, setEnrolled] = React.useState(false);
  const [enroll, setEnroll] = React.useState<EnrollState | null>(null);
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const verified = data.totp.some((f) => f.status === 'verified');
      setEnrolled(verified);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function startEnroll() {
    setPending(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setEnroll({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start MFA enrollment');
    } finally {
      setPending(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll || !code.trim()) return;
    setPending(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;

      setEnrolled(true);
      setEnroll(null);
      setCode('');
      try {
        const { syncMfaEnrollmentStatus } = await import('@/server/actions/mfa');
        await syncMfaEnrollmentStatus({ enrolled: true });
      } catch {
        // best-effort sync
      }
      toast.success('Two-factor authentication enabled');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking MFA status…
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Authenticator app (TOTP) is enabled on your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">
        Add a second factor with an authenticator app (Google Authenticator, 1Password, etc.).
        Required for production staff accounts per your security policy.
      </p>

      {!enroll ? (
        <Button onClick={startEnroll} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Set up authenticator app
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border p-4">
          <p className="font-medium">Scan this QR code</p>
          {enroll.qrCode.startsWith('data:') ? (
            <Image
              src={enroll.qrCode}
              alt="MFA QR code"
              width={180}
              height={180}
              unoptimized
              className="rounded border bg-white p-2"
            />
          ) : (
            <p className="text-xs text-muted-foreground break-all">Secret: {enroll.secret}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="mfa-code">Verification code</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>
          <Button onClick={verifyEnroll} disabled={pending || code.trim().length < 6}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify and enable
          </Button>
        </div>
      )}
    </div>
  );
}
