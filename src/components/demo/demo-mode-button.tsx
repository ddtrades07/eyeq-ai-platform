'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { enterDemoMode } from '@/server/actions/demo';
import { cn } from '@/lib/utils';

/**
 * One-click entry into demo mode as practice owner.
 * Prefer routing public CTAs to /demo so visitors choose a role first.
 * This button remains for internal one-click owner entry.
 */
export function DemoModeButton({
  size = 'default',
  variant = 'default',
  label = 'Live Demo',
  icon: Icon = Sparkles,
  className,
  fullWidth = false,
  /** When true, go to /demo intro instead of auto-signing in as owner */
  introOnly = false,
}: {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  label?: string;
  icon?: LucideIcon;
  className?: string;
  fullWidth?: boolean;
  introOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (introOnly) {
      router.push('/demo');
      return;
    }
    startTransition(async () => {
      const r = await enterDemoMode();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Demo ready. Opening the guided walkthrough…');
      router.push(r.redirect);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      size={size}
      variant={variant}
      className={cn(fullWidth && 'w-full', className)}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {pending ? 'Preparing demo…' : label}
    </Button>
  );
}
