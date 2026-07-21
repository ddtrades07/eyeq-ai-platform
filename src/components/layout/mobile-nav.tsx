'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PATIENT_NAV } from '@/lib/navigation/patient-nav';
import { getStaffMobileNavItems } from '@/lib/navigation/staff-nav';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import type { Role } from '@prisma/client';
import { useT } from '@/components/providers/locale-provider';
import { EyeQLogo } from '@/components/brand/eyeq-logo';

export function MobileNav({
  variant = 'provider',
  role,
}: {
  variant?: 'provider' | 'patient';
  role?: Role;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  const links =
    variant === 'patient'
      ? PATIENT_NAV
      : role
        ? getStaffMobileNavItems(role).map((item) => ({
            href: item.href,
            label: t(item.label),
          }))
        : [];

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-[81] w-72 bg-card shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <EyeQLogo compact variant="icon" className="shrink-0" />
                {role && variant === 'provider' ? (
                  <p className="truncate text-[10px] text-muted-foreground">{ROLE_LABELS[role]}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1 px-3 py-4">
              {links.map((link) => {
                const href = link.href;
                const exact = 'exact' in link ? link.exact : false;
                const active = exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {'label' in link ? link.label : href}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
