'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import {
  DEMO_WALKTHROUGH_STEPS,
  resolveGuideHref,
  type DemoStepStatus,
} from '@/lib/demo/guide-steps';
import { cn } from '@/lib/utils';

const STORAGE_STEP = 'eyeq-demo-walkthrough-step';

function statusLabel(status: DemoStepStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'demo-only':
      return 'Demo only';
    case 'not-configured':
      return 'Not configured';
    case 'blocked':
      return 'Blocked';
  }
}

function statusClass(status: DemoStepStatus): string {
  switch (status) {
    case 'ready':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'demo-only':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'not-configured':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    case 'blocked':
      return 'border-rose-200 bg-rose-50 text-rose-900';
  }
}

export function DemoWalkthroughClient({
  michaelPatientId,
  imagingId,
  encounterId,
}: {
  michaelPatientId: string | null;
  imagingId: string | null;
  encounterId: string | null;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_STEP);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    if (Number.isFinite(n) && n >= 0 && n < DEMO_WALKTHROUGH_STEPS.length) {
      setStepIndex(n);
    }
    setHydrated(true);
  }, []);

  const step = DEMO_WALKTHROUGH_STEPS[stepIndex]!;
  const href = resolveGuideHref(step.href, {
    michaelPatientId,
    imagingId,
    encounterId,
  });
  const nextStep = DEMO_WALKTHROUGH_STEPS[stepIndex + 1];
  const nextHref = nextStep
    ? resolveGuideHref(nextStep.href, {
        michaelPatientId,
        imagingId,
        encounterId,
      })
    : null;

  React.useEffect(() => {
    if (!hydrated) return;
    // Prefetch current + next walkthrough destinations and core demo routes.
    const core = [
      href,
      nextHref,
      '/provider/dashboard',
      '/provider/appointments',
      michaelPatientId ? `/provider/patients/${michaelPatientId}` : '/provider/patients',
      '/provider/imaging',
      '/provider/messages',
      '/provider/reputation',
      '/provider/eye-health-library',
    ].filter(Boolean) as string[];
    for (const path of core) {
      router.prefetch(path);
    }
  }, [hydrated, href, nextHref, router, michaelPatientId]);

  function persist(index: number) {
    setStepIndex(index);
    window.localStorage.setItem(STORAGE_STEP, String(index));
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-800">
            <Compass className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Live Demo walkthrough</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Guided optometry demo</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Follow these steps in order. Every patient and review is synthetic. Demo mode, no live PHI.
            Clinical AI outputs are drafts for provider review only.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-300 text-amber-900">
          Demo mode · Synthetic data
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DEMO_WALKTHROUGH_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => persist(i)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              i === stepIndex
                ? 'bg-primary text-primary-foreground'
                : i < stepIndex
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {s.step}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="border-amber-100/80">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Step {step.step} of {DEMO_WALKTHROUGH_STEPS.length}</Badge>
              <Badge variant="outline" className={statusClass(step.status)}>
                {statusLabel(step.status)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                ~{step.minutes} min
              </Badge>
              <span className="text-xs text-muted-foreground">{step.page}</span>
            </div>
            <CardTitle className="text-xl">{step.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What to click</p>
              <p className="mt-1">{step.action}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What to say</p>
              <p className="mt-1 leading-relaxed">{step.talkingPoint}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected result</p>
              <p className="mt-1 flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{step.expectedResult}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <PrefetchLink
                href={href}
                className={cn(buttonVariants({ size: 'default' }), 'inline-flex items-center gap-1.5')}
              >
                Open {step.page}
                <ExternalLink className="h-3.5 w-3.5" />
              </PrefetchLink>
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0}
                onClick={() => persist(Math.max(0, stepIndex - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {stepIndex < DEMO_WALKTHROUGH_STEPS.length - 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => persist(stepIndex + 1)}
                >
                  Next step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <PrefetchLink
                  href="/provider/dashboard"
                  className={cn(buttonVariants({ variant: 'secondary' }))}
                >
                  Finish on dashboard
                </PrefetchLink>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEMO_WALKTHROUGH_STEPS.slice(stepIndex + 1, stepIndex + 4).map((s) => {
              const upcomingHref = resolveGuideHref(s.href, {
                michaelPatientId,
                imagingId,
                encounterId,
              });
              return (
                <PrefetchLink
                  key={s.id}
                  href={upcomingHref}
                  className="block rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-muted/50"
                  onClick={() => persist(s.step - 1)}
                >
                  <div className="font-medium text-foreground">
                    {s.step}. {s.title}
                  </div>
                  <div className="text-muted-foreground">{s.page} · ~{s.minutes} min</div>
                </PrefetchLink>
              );
            })}
            {stepIndex >= DEMO_WALKTHROUGH_STEPS.length - 1 ? (
              <p className="text-xs text-muted-foreground">
                Walkthrough complete. Reset demo data from the demo banner between sales calls.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
