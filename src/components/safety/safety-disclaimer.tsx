import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact disclaimer rendered alongside any AI-generated output. The
 * platform never produces diagnostic claims, outputs are review-support
 * signals only. Surfacing this consistently is a guardrail for both
 * patients and clinicians.
 */
export function SafetyDisclaimer({
  className,
  variant = 'clinical',
}: {
  className?: string;
  variant?: 'clinical' | 'patient';
}) {
  const copy =
    variant === 'patient'
      ? 'Information here comes from your care team. It is not a substitute for advice from your eye doctor. Call the office or 911 for emergencies.'
      : 'EyeQ AI surfaces review-support signals only. It does not diagnose disease. Final clinical interpretation is always the responsibility of the supervising provider.';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-sky-200/60 bg-sky-50/60 p-3 text-xs text-sky-900',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{copy}</p>
    </div>
  );
}
