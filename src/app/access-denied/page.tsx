import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export const metadata = { title: 'Access denied' };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
          <ShieldOff className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          You do not have access to this page
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account role does not include permission for this area. If you
          think this is a mistake, contact your practice administrator.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/launch" className={buttonVariants()}>
            Go to my home page
          </Link>
        </div>
      </div>
    </div>
  );
}
