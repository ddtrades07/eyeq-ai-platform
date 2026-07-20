'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DEMO_GUIDE_STEPS,
  resolveGuideHref,
  type DemoGuideStep,
} from '@/lib/demo/guide-steps';
import { cn } from '@/lib/utils';

const STORAGE_STEP = 'eyeq-demo-guide-step';
const STORAGE_DISMISSED = 'eyeq-demo-guide-dismissed';

function readStepIndex(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(STORAGE_STEP);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(n) || n < 0 || n >= DEMO_GUIDE_STEPS.length) return 0;
  return n;
}

export function DemoGuidePanel({
  michaelPatientId,
}: {
  michaelPatientId: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_DISMISSED) === '1';
    setOpen(!dismissed);
    setStepIndex(readStepIndex());
    setHydrated(true);
  }, []);

  function persistStep(index: number) {
    setStepIndex(index);
    window.localStorage.setItem(STORAGE_STEP, String(index));
  }

  function dismiss() {
    window.localStorage.setItem(STORAGE_DISMISSED, '1');
    setOpen(false);
  }

  function reopen() {
    window.localStorage.removeItem(STORAGE_DISMISSED);
    setOpen(true);
  }

  if (!hydrated) return null;

  const step: DemoGuideStep = DEMO_GUIDE_STEPS[stepIndex]!;
  const href = resolveGuideHref(step.href, michaelPatientId);
  const pathMatches =
    pathname === href || (href !== '/' && pathname.startsWith(href.split('?')[0]!));

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="fixed bottom-20 left-4 z-40 shadow-md"
        onClick={reopen}
      >
        <Compass className="mr-1.5 h-4 w-4" />
        Demo guide
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed bottom-4 left-4 z-40 w-[min(100vw-2rem,22rem)] border-amber-200/80 bg-white/95 shadow-lg backdrop-blur',
      )}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-700" />
            <CardTitle className="text-sm">Demo guide</CardTitle>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={dismiss}
            aria-label="Dismiss demo guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Step {step.step} of {DEMO_GUIDE_STEPS.length}
          </Badge>
          <Badge variant="secondary">{step.roleLabel}</Badge>
          {pathMatches ? (
            <Badge variant="success">On this page</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">{step.title}</p>
          <p className="text-xs text-muted-foreground">{step.page}</p>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Action:</span> {step.action}
          </p>
          <p>
            <span className="font-medium text-foreground">Shows:</span> {step.demonstrates}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Use the role switcher in the top bar when the step calls for a different role.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={href}>Open page</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={stepIndex <= 0}
            onClick={() => persistStep(Math.max(0, stepIndex - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              persistStep(Math.min(DEMO_GUIDE_STEPS.length - 1, stepIndex + 1))
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
