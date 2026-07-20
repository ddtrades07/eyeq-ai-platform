import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export function ControlledPilotBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      <span className="inline-flex items-center justify-center gap-2 font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
        Controlled Live Pilot — live PHI for this practice only. No auto-send AI, auto-sign notes,
        fake vendor publish, or unverified imports/reminders.
        <Link
          href="/provider/settings/pilot-launch"
          className="underline underline-offset-2 hover:text-amber-800"
        >
          Pilot launch
        </Link>
      </span>
    </div>
  );
}
