import Link from 'next/link';
import { SignupOrgForm } from './signup-form';

export const metadata = { title: 'Create your practice' };

export default function SignupPage() {
  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Start a practice</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create the owner account for your optometry practice.
      </p>
      <div className="mt-6">
        <SignupOrgForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
