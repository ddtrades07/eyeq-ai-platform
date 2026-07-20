import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function DemoFailSafe({
  title = 'Something went wrong in the demo',
  description = 'This is a polished fail-safe for the live demo. No raw stack traces are shown. Try returning to the walkthrough or resetting demo data.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="mx-auto max-w-lg border-amber-200/80">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/provider/demo-walkthrough" className={cn(buttonVariants())}>
          Return to walkthrough
        </Link>
        <Link
          href="/provider/dashboard"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Open dashboard
        </Link>
        <Link href="/demo" className={cn(buttonVariants({ variant: 'ghost' }))}>
          Demo home
        </Link>
      </CardContent>
    </Card>
  );
}
