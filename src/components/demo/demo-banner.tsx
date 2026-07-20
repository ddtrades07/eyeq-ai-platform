'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Sparkles, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { resetDemoModeAction } from '@/server/actions/demo';
import { signOutAndRedirect } from '@/lib/auth/sign-out-client';

/**
 * Banner shown across the staff layout while in the demo organization.
 * Lets pitch users wipe & re-seed the showcase dataset between demos,
 * or exit demo mode to land back on the marketing page.
 */
export function DemoBanner() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [signOutPending, startSignOut] = React.useTransition();

  function reset() {
    if (!confirm('Reset the demo? All demo data will be wiped and re-created.')) {
      return;
    }
    startTransition(async () => {
      const r = await resetDemoModeAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Demo reset, fresh dataset loaded.');
      router.refresh();
    });
  }

  function exitDemo() {
    startSignOut(() => {
      void signOutAndRedirect('/');
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-amber-50 px-6 py-2 text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="font-semibold uppercase tracking-wider">
          Demo mode
        </span>
        <span className="hidden text-amber-900/80 sm:inline">
          · EyeQ Vision Center demo. Use the demo guide (bottom left) and role switcher to walk
          through Michael Thompson&apos;s visit. Reset between meetings.
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-amber-900 hover:bg-amber-100"
          onClick={reset}
          disabled={pending || signOutPending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Reset demo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-amber-900 hover:bg-amber-100"
          onClick={exitDemo}
          disabled={pending || signOutPending}
        >
          {signOutPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Exit demo
        </Button>
      </div>
    </div>
  );
}
