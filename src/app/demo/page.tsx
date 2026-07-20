import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { DemoModeButton } from '@/components/demo/demo-mode-button';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/rbac';
import { serverEnv } from '@/lib/env';
import { DEMO_ROLE_ACCOUNTS } from '@/lib/demo/accounts';
import { DemoRoleEnterButton } from '@/components/demo/demo-role-enter-button';

export const metadata = {
  title: 'EyeQ Demo',
  description: 'Explore EyeQ AI from every role in a safe demo environment.',
};

export default async function DemoLandingPage() {
  if (!serverEnv.demoModeEnabled) {
    redirect('/login');
  }

  const user = await getCurrentUser();
  if (user) {
    redirect(isStaffRole(user.role) ? '/provider/dashboard' : '/patient/home');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            EyeQ AI
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Practice sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Demo environment
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Explore EyeQ as a complete optometry practice.
          </h1>
          <p className="text-muted-foreground">
            See how EyeQ supports scheduling, patient care, imaging, billing, optical, and the
            patient portal across every role.
          </p>
          <DemoModeButton label="Enter as practice owner" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-100/80 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommended walkthrough</CardTitle>
              <p className="text-sm text-muted-foreground">
                Follow one patient, Michael Thompson, through a glaucoma follow-up visit.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {[
                  'Front Desk',
                  'Technician',
                  'Optometrist',
                  'Billing',
                  'Patient',
                ].map((step, i, arr) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="font-medium">{step}</span>
                    {i < arr.length - 1 ? (
                      <span className="text-muted-foreground">→</span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Check him in, complete pretesting and imaging, review and sign the chart, prepare
                the claim, then see the approved summary in his patient portal.
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-100/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Demo practice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">EyeQ Vision Center</p>
              <p>3 locations · 9 team members</p>
              <p>12 fictional patients</p>
              <p className="pt-2 text-xs">
                All patients, staff, and data are fictional. No real patient, payer, pharmacy, or
                lab is contacted.
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Choose a role to explore</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEMO_ROLE_ACCOUNTS.map((role) => (
            <Card key={role.key} className="border-amber-100/80">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-700" />
                  <CardTitle className="text-base">{role.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {role.workflows.slice(0, 4).map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
                <DemoRoleEnterButton roleKey={role.key} label="Enter demo" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
