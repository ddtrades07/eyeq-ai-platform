import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, Clock, Shield, Sparkles, Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/rbac';
import { serverEnv } from '@/lib/env';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { DEMO_ROLE_ACCOUNTS } from '@/lib/demo/accounts';
import { DEMO_FEATURE_CARDS, DEMO_PRIMARY_ENTRIES } from '@/lib/demo/guide-steps';
import { DemoRoleEnterButton } from '@/components/demo/demo-role-enter-button';
import { EyeQLogo } from '@/components/brand/eyeq-logo';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Live Demo · EyeQ',
  description:
    'Explore EyeQ, a modern optometry operating system, in a safe demo with synthetic data only.',
};

export default async function DemoLandingPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.organizationSlug === DEMO_ORG_SLUG) {
      redirect(isStaffRole(user.role) ? '/provider/demo-walkthrough' : '/patient/home');
    }
    redirect(isStaffRole(user.role) ? '/provider/dashboard' : '/patient/home');
  }

  if (!serverEnv.demoModeEnabled) {
    return <DemoUnavailable />;
  }

  const primaryKeys = new Set(DEMO_PRIMARY_ENTRIES.map((e) => e.key));
  const moreRoles = DEMO_ROLE_ACCOUNTS.filter((r) => !primaryKeys.has(r.key));

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(245,188,66,0.18),transparent),linear-gradient(to_bottom,#fffbeb,var(--background))]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="EyeQ home">
            <EyeQLogo size="nav" variant="mark" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Practice sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="max-w-3xl space-y-5">
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Live Demo · Synthetic data only
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            EyeQ is a modern optometry operating system.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Choose a role, follow the guided walkthrough, then explore real pages with synthetic data.
            No live PHI. Clinical AI outputs are drafts for provider review only. Google review replies
            stay DEMO_PUBLISHED unless a live Google connection is configured.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">
              <Shield className="h-3 w-3" /> Synthetic demo data only
            </span>
            <span className="rounded-full border px-2.5 py-1">No live PHI</span>
            <span className="rounded-full border px-2.5 py-1">
              Clinical AI is provider-review only
            </span>
            <span className="rounded-full border px-2.5 py-1">Not a full EHR/RCM replacement</span>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Choose how to enter</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each path opens the guided walkthrough first (staff) or the patient portal (patient). Synthetic
          data only.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {DEMO_PRIMARY_ENTRIES.map((entry) => (
            <Card key={entry.key} className="border-amber-100/90 bg-white/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />~{entry.estimatedMinutes} min
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </CardHeader>
              <CardContent>
                <DemoRoleEnterButton
                  roleKey={entry.key}
                  label={entry.buttonLabel}
                  fullWidth
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="#features"
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex items-center gap-1.5')}
          >
            <Star className="h-4 w-4" />
            See features covered
          </Link>
          <Link
            href="#more-roles"
            className={cn(buttonVariants({ variant: 'ghost' }), 'inline-flex items-center gap-1.5')}
          >
            <BookOpen className="h-4 w-4" />
            More roles
          </Link>
        </div>

        <div id="features" className="mt-10 scroll-mt-20">
          <h2 className="text-lg font-semibold tracking-tight">What the Live Demo covers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            After you enter as owner, provider, or staff, EyeQ opens{' '}
            <code className="text-xs">/provider/demo-walkthrough</code> before the dashboard.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_FEATURE_CARDS.map((card) => (
              <Card key={card.title} className="border-amber-100/80 bg-white/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{card.detail}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-100/80 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Guided walkthrough path</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Dashboard · Schedule · Patient chart · Encounter / SOAP</li>
                <li>Rx · Imaging · AI Image Analysis · Eye Health Library</li>
                <li>Patient portal · Secure messages · Google Reviews</li>
                <li>Optical · Billing drafts · PHI readiness · Audit / support</li>
              </ol>
            </CardContent>
          </Card>
          <Card className="border-amber-100/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Demo practice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">EyeQ Vision Center</p>
              <p>Synthetic patients and staff only</p>
              <p>Recording mode: add <code className="text-xs">?recording=true</code></p>
              <p className="pt-2 text-xs">
                Reset between sales calls from the demo banner. Reset never runs on production orgs.
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 id="more-roles" className="mt-12 scroll-mt-20 text-lg font-semibold tracking-tight">
          More roles
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Technician, billing, optical, and admin personas for deeper walkthroughs.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moreRoles.map((role) => (
            <Card key={role.key} className="border-amber-100/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{role.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </CardHeader>
              <CardContent>
                <DemoRoleEnterButton roleKey={role.key} label={`Enter as ${role.title}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

/** Public /demo stays reachable; entry is blocked when this host is not a demo environment. */
function DemoUnavailable() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(245,188,66,0.12),transparent),linear-gradient(to_bottom,#fffbeb,var(--background))]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="EyeQ home">
            <EyeQLogo size="nav" variant="mark" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Practice sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-16 lg:px-8">
        <Badge variant="outline" className="border-amber-300 text-amber-900">
          Live Demo · Not available on this host
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Guided demo is not enabled here
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          This deployment is not running in demo mode. The public Live Demo uses a separate
          synthetic-data environment (<code className="text-xs">APP_ENV=demo</code> with{' '}
          <code className="text-xs">DEMO_MODE=true</code>) so production PHI hosts stay fail-closed.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Ask your EyeQ contact for the demo link, or request an introduction below.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className={cn(buttonVariants())}>
            Request an introduction
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
