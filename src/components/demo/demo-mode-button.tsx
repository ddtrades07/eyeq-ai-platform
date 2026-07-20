'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { enterDemoMode } from '@/server/actions/demo';
import { cn } from '@/lib/utils';

/**
 * One-click entry point into demo mode. Provisions the demo tenant
 * if needed, signs the visitor in, and lands on the dashboard.
 */
export function DemoModeButton({
  size = 'default',
  variant = 'default',
  label = 'Try the live demo',
  icon: Icon = Sparkles,
  className,
  fullWidth = false,
}: {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  label?: string;
  icon?: LucideIcon;
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await enterDemoMode();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Demo ready, landing you in the practice…');
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
