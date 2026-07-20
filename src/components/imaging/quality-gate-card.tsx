import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import type { ImageQualityAssessment } from '@/lib/imaging/types';

import { cn } from '@/lib/utils';



export function QualityGateCard({ q }: { q: ImageQualityAssessment }) {

  const classification = q.classification ?? (q.gradable === false ? 'Not Gradable' : 'Gradable');

  const color = q.score >= 70 ? 'text-emerald-600' : q.score >= 45 ? 'text-amber-600' : 'text-red-600';

  const allowed = q.descriptiveAnalysisAllowed ?? q.gradable !== false;



  return (

    <Card>

      <CardHeader className="pb-3">

        <CardTitle className="text-base">Image quality gate</CardTitle>

      </CardHeader>

      <CardContent className="space-y-3 text-sm">

        <div className="flex items-center justify-between">

          <span className="font-medium">Quality classification</span>

          <Badge variant={classification === 'Not Gradable' ? 'destructive' : classification.includes('Limitations') ? 'warning' : 'success'}>

            {classification}

          </Badge>

        </div>



        <div>

          <div className="mb-1 flex items-center justify-between text-xs">

            <span>Quality score (configurable screening threshold)</span>

            <span className={cn('font-semibold', color)}>{q.score}/100</span>

          </div>

          <div className="h-2 w-full rounded-full bg-muted">

            <div

              className={cn(

                'h-2 rounded-full transition-all',

                q.score >= 70 ? 'bg-emerald-500' : q.score >= 45 ? 'bg-amber-500' : 'bg-red-500',

              )}

              style={{ width: `${q.score}%` }}

            />

          </div>

          <p className="mt-1 text-[10px] text-muted-foreground">

            70–100 Gradable · 45–69 Gradable With Limitations · below 45 Not Gradable

          </p>

        </div>



        <div className="rounded-md border bg-muted/30 p-2.5 text-xs">

          <p>

            <span className="font-semibold">Descriptive analysis: </span>

            {allowed ? 'May proceed with limitations displayed prominently' : 'Not allowed. Retake or manual review required.'}

          </p>

          {q.retakeRecommended ? (

            <p className="mt-1 text-amber-800">Retake recommended before relying on automated descriptions.</p>

          ) : null}

        </div>



        <div className="grid grid-cols-2 gap-2 text-xs">

          <Detail label="Focus" value={q.focus} />

          <Detail label="Brightness" value={q.brightness} />

          <Detail label="Contrast" value={q.contrast} />

          <Detail label="Field of view" value={q.fieldOfView} />

        </div>



        {q.limitingFactors.length > 0 && (

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">

            <div className="mb-1 flex items-center gap-1 font-semibold">

              <AlertTriangle className="h-3.5 w-3.5" />

              Limiting factors

            </div>

            <ul className="ml-4 list-disc space-y-0.5">

              {q.limitingFactors.map((f, i) => (

                <li key={i}>{f}</li>

              ))}

            </ul>

          </div>

        )}

      </CardContent>

    </Card>

  );

}



function Detail({ label, value }: { label: string; value: string }) {

  return (

    <div>

      <span className="text-muted-foreground">{label}:</span>{' '}

      <span className="font-medium capitalize">{value}</span>

    </div>

  );

}


