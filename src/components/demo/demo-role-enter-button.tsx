'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { enterDemoAsRole } from '@/server/actions/demo';
import type { DemoRoleKey } from '@/lib/demo/accounts';

export function DemoRoleEnterButton({
  roleKey,
  label = 'Enter demo',
  fullWidth,
}: {
  roleKey: DemoRoleKey;
  label?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await enterDemoAsRole(roleKey);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Demo ready. Opening guided experience…');
      router.push(r.redirect);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={fullWidth ? 'w-full' : undefined}
      variant={roleKey === 'owner' ? 'default' : 'outline'}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? 'Starting…' : label}
    </Button>
  );
}
