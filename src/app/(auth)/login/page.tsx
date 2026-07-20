import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/rbac';
import { serverEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (user) {
    redirect(params.next || (isStaffRole(user.role) ? '/provider/dashboard' : '/patient/home'));
  }

  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back to EyeQ AI.
      </p>

      {serverEnv.demoModeEnabled ? (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
          <p className="text-sm font-medium text-foreground">
            Pitching EyeQ AI to a client?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open the Live Demo intro, pick a role, and follow the guided walkthrough with
            synthetic patients only.
          </p>
          <div className="mt-3">
            <Link href="/demo" className={cn(buttonVariants(), 'w-full')}>
              Live Demo
            </Link>
          </div>
        </div>
      ) : null}

      {serverEnv.demoModeEnabled ? (
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or sign in
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : (
        <div className="mt-6" />
      )}

      <LoginForm nextPath={params.next} />
      {serverEnv.demoModeEnabled ? (
        <div className="mt-4 text-center text-sm">
          <Link href="/demo" className="font-medium text-primary hover:underline">
            Explore every role in the EyeQ demo
          </Link>
        </div>
      ) : null}
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>
          Don&apos;t have a practice yet?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
          .
        </p>
        <p>
          Patient?{' '}
          <Link href="/signup-patient" className="font-medium text-primary hover:underline">
            Create a portal account
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
