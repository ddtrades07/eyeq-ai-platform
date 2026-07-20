import Link from 'next/link';
import { SignupPatientForm } from './signup-patient-form';

export const metadata = { title: 'Patient sign-up' };

export default async function SignupPatientPage({
  searchParams,
}: {
  searchParams?: Promise<{ practice?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Patient portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your portal account to manage appointments and prescriptions.
      </p>
      <div className="mt-6">
        <SignupPatientForm defaultSlug={sp.practice} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Need staff access instead?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Start a practice
        </Link>
        .
      </p>
    </div>
  );
}
