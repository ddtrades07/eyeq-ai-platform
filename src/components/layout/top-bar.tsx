'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, LogOut, Plus, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOutAndRedirect } from '@/lib/auth/sign-out-client';
import { initials } from '@/lib/utils';
import { LanguageSelector } from '@/components/layout/language-selector';
import { AskEyeQBar } from '@/components/copilot/ask-eyeq-bar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { LocationSwitcher } from '@/components/layout/location-switcher';
import { DemoRoleSwitcher } from '@/components/demo/demo-role-switcher';
import { useT } from '@/components/providers/locale-provider';
import type { LocationOption } from '@/lib/location/scope';
import type { Role } from '@prisma/client';

export function TopBar({
  userName,
  email,
  role,
  roleLabel,
  subtitle,
  locations,
  activeLocationId,
  canViewAllLocations,
  variant = 'provider',
  inDemo = false,
  recordingMode = false,
  notificationSlot,
}: {
  userName: string;
  email: string;
  role?: Role;
  roleLabel: string;
  subtitle?: string;
  locations?: LocationOption[];
  activeLocationId?: string | null;
  canViewAllLocations?: boolean;
  variant?: 'provider' | 'patient';
  inDemo?: boolean;
  recordingMode?: boolean;
  notificationSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const [signingOut, setSigningOut] = React.useState(false);

  function handleSignOut() {
    setSigningOut(true);
    void signOutAndRedirect(inDemo ? '/demo' : '/login');
  }

  const [first, last] = userName.split(' ');

  return (
    <header className="glass-header sticky top-0 z-30 flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav variant={variant} role={role} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {userName}
            </h1>
            <Badge
              variant="secondary"
              className="hidden border border-primary/15 bg-primary/10 text-[10px] text-primary sm:inline-flex"
            >
              {roleLabel}
            </Badge>
            {subtitle ? (
              <Badge variant="outline" className="hidden text-[10px] lg:inline-flex">
                {subtitle}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {inDemo && !recordingMode ? <DemoRoleSwitcher currentRoleLabel={roleLabel} /> : null}
        {locations && locations.length > 0 ? (
          <LocationSwitcher
            locations={locations}
            activeLocationId={activeLocationId ?? null}
            canViewAll={canViewAllLocations ?? false}
          />
        ) : null}
        {variant === 'provider' ? <AskEyeQBar /> : null}
        {variant === 'provider' ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden h-8 gap-1 rounded-xl sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> Quick create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push('/provider/patients')}>
                New patient
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/provider/appointments')}>
                New appointment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/provider/messages')}>
                New message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/provider/support')}>
                Support ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!recordingMode ? <LanguageSelector /> : null}
        {variant === 'provider'
          ? (notificationSlot ?? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="rounded-xl border border-transparent hover:border-border/70 hover:bg-white/60 dark:hover:bg-white/5"
              >
                <Bell className="h-4 w-4" />
              </Button>
            ))
          : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/50 px-2 py-1 text-sm transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-lens-aqua/20 text-xs font-semibold text-primary">
                {initials(first, last)}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card-strong border-border/70">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted-foreground">{email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push(variant === 'patient' ? '/patient/profile' : '/provider/settings')
              }
            >
              <User className="mr-2 h-4 w-4" />{' '}
              {variant === 'patient' ? 'Profile' : t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/provider/support">
                Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
              <LogOut className="mr-2 h-4 w-4" /> {t('common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
