'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { switchDemoRole } from '@/server/actions/demo';
import type { DemoRoleKey } from '@/lib/demo/accounts';

const ROLES: { key: DemoRoleKey; label: string }[] = [
  { key: 'owner', label: 'Owner' },
  { key: 'optometrist', label: 'Optometrist' },
  { key: 'technician', label: 'Technician' },
  { key: 'frontdesk', label: 'Front Desk' },
  { key: 'billing', label: 'Billing' },
  { key: 'optical', label: 'Optical Staff' },
  { key: 'admin', label: 'Administrator' },
  { key: 'patient', label: 'Patient Portal' },
];

export function DemoRoleSwitcher({ currentRoleLabel }: { currentRoleLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onSwitch(key: DemoRoleKey) {
    startTransition(async () => {
      const r = await switchDemoRole(key);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Switched demo role');
      router.push(r.redirect);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-amber-300 bg-amber-50 text-xs text-amber-950 hover:bg-amber-100"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Repeat className="h-3.5 w-3.5" />
          )}
          Demo: {currentRoleLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((role) => (
          <DropdownMenuItem key={role.key} onClick={() => onSwitch(role.key)}>
            {role.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
