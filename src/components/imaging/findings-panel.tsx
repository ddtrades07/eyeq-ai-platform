import { Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import type { PossibleFinding } from '@/lib/imaging/types';

import type { FindingsAnalysisState } from '@/lib/imaging/constants';

import { MANUAL_REVIEW_MESSAGE } from '@/lib/imaging/constants';

import { cn } from '@/lib/utils';



const CONFIDENCE_VARIANT = {

  low: 'secondary',

  moderate: 'info',

  high: 'warning',

} as const;



export function FindingsPanel({

  findings,

  analysisState = 'completed',

  title = 'Possible observations for provider review',
}: {
  findings: PossibleFinding[];
  analysisState?: FindingsAnalysisState;
  title?: string;
}) {
  if (analysisState === 'manual' || analysisState === 'awaiting') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{MANUAL_REVIEW_MESSAGE}</p>
        </CardContent>
      </Card>
    );
  }

  if (analysisState === 'not_gradable' || analysisState === 'failed') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Automated analysis did not generate observations. Retake or manual provider review
            required. This is not a diagnosis.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analysis completed. No specific areas were flagged beyond general review. This is not a
            clearance or diagnosis. Provider examination and sign-off are still required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-5 w-5 text-indigo-600" />
          {title} ({findings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((f) => (
          <div
            key={f.id}
            className={cn('rounded-lg border-l-4 border-l-amber-400 bg-white p-3 shadow-sm')}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{f.finding}</span>
              <Badge variant={CONFIDENCE_VARIANT[f.confidence]} className="text-[10px]">
                {f.confidence === 'moderate' ? 'medium' : f.confidence} confidence
              </Badge>
            </div>
            <ul className="ml-4 list-disc space-y-0.5 text-xs text-foreground">
              {f.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Not a diagnosis. Provider review required. May be incomplete or incorrect.{' '}
              {f.nextStep}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


