import Link from 'next/link';
import { ShieldCheck, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/provider/reputation', label: 'Google Reviews', match: 'exact' as const },
  { href: '/provider/reputation/questions', label: 'Google Questions', match: 'prefix' as const },
  { href: '/provider/reputation/drafts', label: 'Reply Drafts', match: 'prefix' as const },
  { href: '/provider/reputation/analytics', label: 'Review Analytics', match: 'prefix' as const },
];

export function ReputationShell({
  pathname,
  demoMode,
  connectedLabel,
  children,
}: {
  pathname: string;
  demoMode: boolean;
  connectedLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Reputation</h2>
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              Google Business
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Google reviews and questions with draft replies. Approve before anything is published.
          </p>
        </div>
        <Badge variant={demoMode ? 'secondary' : 'default'}>{connectedLabel}</Badge>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>
            Public replies must never include PHI, diagnoses, or visit details. AI drafts require staff
            approval. Nothing auto-publishes.
          </p>
          {demoMode ? (
            <p>
              Demo mode: synthetic reviews and questions only. Approve &amp; publish marks replies as{' '}
              <strong>DEMO_PUBLISHED</strong> (not posted to Google). Live publishing requires a connected
              Google Business Profile.
            </p>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b pb-px" aria-label="Reputation sections">
        {TABS.map((tab) => {
          const active =
            tab.match === 'exact'
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'rounded-b-none border-b-2 border-transparent',
                active && 'border-primary bg-muted/40 font-semibold text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

export function ReputationLockedPanel() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-background p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">Reputation access required</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your role cannot manage Google reviews. Ask an Owner or Admin to open Reputation, or switch to
        the Owner demo role for the full walkthrough.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/provider/dashboard" className={buttonVariants({ size: 'sm' })}>
          Back to dashboard
        </Link>
        <Link
          href="/provider/demo-walkthrough"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          Demo walkthrough
        </Link>
      </div>
    </div>
  );
}
