'use client';

import { Eye, FileText, ListChecks, Shield, GitCompareArrows } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityGateCard } from './quality-gate-card';
import { FindingsPanel } from './findings-panel';
import { CorrelationCard, TimelineComparisonCard } from './correlation-card';
import {
  DESCRIPTIVE_DISCLOSURE,
  IMAGING_AI_TITLE,
  IMAGING_SAFETY_DISCLAIMER,
  MANUAL_REVIEW_MESSAGE,
  NOT_A_DIAGNOSIS_BADGE,
  PROVIDER_REVIEW_REQUIRED_BADGE,
} from '@/lib/imaging/constants';
import { parseProviderReviewAnalysis } from '@/lib/imaging/descriptive-schema';
import type { StructuredImagingReview } from '@/lib/imaging/types';

export function ImagingReviewResults({
  review,
}: {
  review: StructuredImagingReview;
}) {
  const status = review.analysisStatusLabel ?? 'Awaiting Analysis';
  const isManual = review.manualReviewOnly && !review.isDevelopmentMock;
  const isDescriptive = review.analysisMode === 'descriptive' && !isManual;
  const analysis =
    review.descriptiveReview?.providerReviewAnalysis ??
    parseProviderReviewAnalysis(review.descriptiveReview) ??
    null;

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="warning">{PROVIDER_REVIEW_REQUIRED_BADGE}</Badge>
          <Badge variant="outline">{NOT_A_DIAGNOSIS_BADGE}</Badge>
        </div>
        <p className="leading-relaxed">{IMAGING_SAFETY_DISCLAIMER}</p>
      </div>

      {review.isDevelopmentMock ? (
        <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          DEVELOPMENT MOCK ANALYSIS. Not clinically validated. For testing only. Not a diagnosis.
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{IMAGING_AI_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Badge
            variant={
              status.includes('Complete')
                ? 'success'
                : status.includes('Failed')
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {status.replace(/finding/gi, 'observation').replace(/diagnosis/gi, 'analysis')}
          </Badge>
          {isManual ? (
            <p className="text-muted-foreground">{MANUAL_REVIEW_MESSAGE}</p>
          ) : null}
          {isDescriptive ? (
            <p className="text-xs text-muted-foreground">{DESCRIPTIVE_DISCLOSURE}</p>
          ) : null}
          {review.descriptiveReview ? (
            <p className="text-xs text-muted-foreground">
              Model: {review.descriptiveReview.modelName}
              {review.descriptiveReview.modelVersion
                ? ` · ${review.descriptiveReview.modelVersion}`
                : ''}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <QualityGateCard q={review.quality} />

      {!isManual && analysis ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">1. Image overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <KV k="Image type" v={analysis.imageOverview.imageType || '—'} />
              <KV k="Eye" v={analysis.imageOverview.eye || '—'} />
              <KV k="Image quality" v={analysis.imageOverview.imageQuality || '—'} />
              <KV k="Visible region" v={analysis.imageOverview.visibleRegion || '—'} />
              {analysis.imageOverview.limitations.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                    Limitations
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-950">
                    {analysis.imageOverview.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-5 w-5 text-primary" />
                2. What the AI appears to see
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {analysis.appearsToSee.length ? (
                <ul className="list-disc space-y-1.5 pl-4">
                  {analysis.appearsToSee.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  No narrative observations returned. Provider should review the image directly.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                3. Possible observations for provider review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {analysis.possibleObservations.length === 0 ? (
                <p className="text-muted-foreground">
                  No possible observations were flagged. This is not a clearance or diagnosis —
                  provider review is still required.
                </p>
              ) : (
                analysis.possibleObservations.map((o, i) => (
                  <div
                    key={`${o.observation}-${i}`}
                    className="rounded-md border border-border/70 bg-white/70 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{o.observation}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {o.confidence} confidence
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Region: {o.region}</p>
                    <p className="mt-2 text-xs">
                      <span className="font-semibold">Why flagged:</span> {o.whyFlagged}
                    </p>
                    <p className="mt-1 text-xs">
                      <span className="font-semibold">Provider should inspect:</span>{' '}
                      {o.providerShouldInspect}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-5 w-5" />
                4. Areas to inspect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm">
                {(analysis.areasToInspect.length
                  ? analysis.areasToInspect
                  : [
                      'Optic nerve',
                      'Macula',
                      'Vessels',
                      'Peripheral retina if visible',
                      'Hemorrhages/exudates if visible',
                      'Media opacity/artifact',
                      'Image quality limitations',
                      'Comparison to prior imaging if available',
                    ]
                ).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="h-5 w-5" />
                5. Comparison to prior imaging
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                {analysis.priorComparison.available
                  ? analysis.priorComparison.summary
                  : 'No prior image available for comparison.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Possible interval change language is never definitive. Provider must confirm any
                change.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                6. Suggested next review steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="list-disc space-y-1 pl-4">
                {(analysis.suggestedReviewSteps.length
                  ? analysis.suggestedReviewSteps
                  : [
                      'Compare with prior imaging if available',
                      'Review OCT/RNFL if available',
                      'Correlate with VA, IOP, symptoms, chart diagnoses, medications, and exam findings',
                      'Repeat imaging if image quality is poor',
                      'Document provider interpretation',
                    ]
                ).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                These are provider review steps only. EyeQ does not suggest treatment or create a
                final diagnosis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                7. Provider sign-off required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                AI-generated analysis remains a draft until the provider accepts, edits, rejects, or
                signs their own interpretation.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/20 p-3 text-xs">
                  <p className="font-semibold">AI-generated analysis</p>
                  <p className="mt-1 text-muted-foreground">
                    Possible observations only · may be incomplete or incorrect
                  </p>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                  <p className="font-semibold">Provider final interpretation</p>
                  <p className="mt-1 text-muted-foreground">
                    Required before any clinical use of this review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : !isManual && review.descriptiveReview ? (
        <>
          <FindingsPanel
            findings={review.possibleFindings}
            analysisState={review.possibleFindings.length ? 'completed' : 'completed-empty'}
            title="Possible observations for provider review"
          />
        </>
      ) : !isManual ? (
        <FindingsPanel
          findings={review.possibleFindings}
          analysisState={review.possibleFindings.length ? 'completed' : 'completed-empty'}
          title="Possible observations for provider review"
        />
      ) : null}

      <CorrelationCard factors={review.correlation} />

      {review.timelineComparisons.length > 0 ? (
        <TimelineComparisonCard comparisons={review.timelineComparisons} />
      ) : (
        !isManual ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              No prior image available for comparison.
            </CardContent>
          </Card>
        ) : null
      )}

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0" />
        {review.safetyDisclaimer || IMAGING_SAFETY_DISCLAIMER}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
