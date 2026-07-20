import Link from 'next/link';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  buildReadinessSnapshot,
  evaluateOnboardingReadiness,
} from '@/lib/onboarding/readiness';

export function OnboardingReadinessCard({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildReadinessSnapshot>;
}) {
  const readiness = evaluateOnboardingReadiness(snapshot);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Go-live readiness</CardTitle>
            <CardDescription>
              {readiness.completedCount} of {readiness.items.length} checklist items complete
            </CardDescription>
          </div>
          <Badge variant={readiness.readyForGoLive ? 'default' : 'destructive'}>
            {readiness.readyForGoLive ? 'Ready for go-live' : `${readiness.blockingCount} blocking`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {readiness.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : item.blocking ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={item.complete ? 'text-muted-foreground' : 'font-medium'}>{item.label}</p>
              {item.detail ? (
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              ) : null}
            </div>
            {item.href && !item.complete ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href={item.href}>Fix</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
