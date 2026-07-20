import type { ImageType } from '@prisma/client';
import { serverEnv } from '@/lib/env';
import { IMAGING_SAFETY_DISCLAIMER } from './config';
import {
  providerReviewImageAnalysisSchema,
  providerReviewToDescriptive,
  type DescriptiveImagingReview,
} from '../descriptive-schema';
import type {
  ImagingProvider,
  ProviderAnalysisInput,
  ProviderAnalysisOutput,
  NormalizedFinding,
} from './imaging-provider-interface';

const DESCRIPTIVE_SYSTEM = `You are providing image analysis support for an optometry provider.

Rules you must always follow:
- Do not diagnose.
- Do not state certainty or confirmed disease.
- Do not recommend treatment.
- Do not tell the patient what they have.
- Do not invent patient history.
- Do not infer details not visible in the image.
- Do not mention conditions unless phrased as possible observations for provider review.
- Use cautious language only: "possible observation", "may be present", "appears", "suggested area to inspect", "provider should confirm", "may be incomplete or incorrect".
- Never use: "diagnosed", "confirmed", "disease detected", "definitive finding", "patient has", "treatment required", or "normal/abnormal" as final truth.
- Mention image limitations (blur, lighting, artifact, cropping, missing context).
- If image quality is insufficient, say so and set imageQuality accordingly.
- If the image type is unclear, say so.
- Require provider confirmation in every observation.
- Return ONLY structured JSON matching the required schema.
- status must be "review_support".
- providerSignoffRequired must be true.
- disclaimer must state this is not a diagnosis and must be confirmed by the provider.`;

function modalityInstructions(modality: ImageType): string {
  switch (modality) {
    case 'FUNDUS':
      return 'Describe visible optic disc, cup appearance if visible, macula, vessels, posterior pole, hemorrhage-like or exudate-like regions, pigmentary changes, media opacity, artifacts. Do not calculate precise cup-to-disc ratio unless clearly measurable. Frame all as possible observations for provider review.';
    case 'OCT':
      return 'Describe scan/report quality, foveal contour appearance, retinal layers if visible, fluid-like spaces, thickness irregularities, segmentation artifacts. Never diagnose.';
    case 'VISUAL_FIELD':
      return 'Describe report readability, laterality, reliability indices if visible, fixation losses, false positive/negative values, displayed pattern. Do not diagnose.';
    case 'SLIT_LAMP':
    case 'EXTERNAL_PHOTO':
      return 'Describe lids, conjunctiva, corneal clarity, redness, opacity-like features, glare limitations. Do not diagnose.';
    case 'TOPOGRAPHY':
      return 'Describe map readability, scale/legend, centration, symmetry, irregularity patterns. Do not diagnose.';
    default:
      return 'Describe only what is visibly present. Note if modality is unclear. Do not diagnose.';
  }
}

function mapPriority(p: DescriptiveImagingReview['reviewPriority']): ProviderAnalysisOutput['reviewPriority'] {
  switch (p) {
    case 'Same-Day Provider Review':
      return 'same-day';
    case 'Review Soon':
      return 'review-soon';
    case 'Routine Review':
      return 'routine';
    default:
      return 'routine';
  }
}

function toNormalizedFindings(review: DescriptiveImagingReview): NormalizedFinding[] {
  const fromObservations = review.visibleObservations.map((o) => ({
    findingCode: o.id,
    findingLabel: o.observation,
    anatomicalLocation: o.region,
    laterality: o.laterality,
    evidenceDescription: o.visualEvidence,
    confidenceCategory: (['low', 'medium', 'moderate', 'high'].includes(o.confidence.toLowerCase())
      ? o.confidence.toLowerCase() === 'medium'
        ? 'moderate'
        : o.confidence.toLowerCase()
      : 'low') as 'low' | 'moderate' | 'high',
    limitations: [],
    supportedByModel: true,
    actionCategory: 'Provider review recommended — not a diagnosis',
  }));

  const fromAreas = review.possibleAreasForReview.map((a, i) => ({
    findingCode: `area-${i}`,
    findingLabel: a.label,
    anatomicalLocation: a.region,
    evidenceDescription: a.reason,
    confidenceCategory: (a.confidence.toLowerCase() === 'medium'
      ? 'moderate'
      : a.confidence.toLowerCase() === 'high'
        ? 'high'
        : a.confidence.toLowerCase() === 'moderate'
          ? 'moderate'
          : 'low') as 'low' | 'moderate' | 'high',
    limitations: a.clinicalCorrelationNeeded,
    supportedByModel: true,
    actionCategory: 'Correlate with examination and history — not a diagnosis',
  }));

  return [...fromObservations, ...fromAreas];
}

export const descriptiveAiProvider: ImagingProvider = {
  name: 'AI Image Analysis for Provider Review',
  mode: 'descriptive',

  supportsModality() {
    return true;
  },

  async analyze(input: ProviderAnalysisInput): Promise<ProviderAnalysisOutput> {
    const started = Date.now();
    const apiKey = serverEnv.openaiApiKey;
    const visionModel = process.env.OPENAI_VISION_MODEL ?? serverEnv.openaiModel ?? 'gpt-4o';

    if (!apiKey) {
      return {
        analysisStatus: 'failed',
        modelName: visionModel,
        modelVersion: 'n/a',
        intendedUse: 'AI image analysis for provider review — not a diagnosis',
        supportedFindings: [],
        possibleFindings: [],
        limitations: ['OPENAI_API_KEY is not configured on the server.'],
        outOfDistribution: false,
        requiresManualReview: true,
        reviewPriority: 'routine',
        isDevelopmentMock: false,
        failureReason: 'Imaging-analysis provider not configured (missing API key)',
        processingTimeMs: Date.now() - started,
      };
    }

    if (!input.signedImageUrl) {
      return {
        analysisStatus: 'failed',
        modelName: visionModel,
        modelVersion: 'n/a',
        intendedUse: 'AI image analysis for provider review — not a diagnosis',
        supportedFindings: [],
        possibleFindings: [],
        limitations: ['Image could not be retrieved for analysis (missing signed URL or non-image file).'],
        outOfDistribution: true,
        requiresManualReview: true,
        reviewPriority: 'routine',
        isDevelopmentMock: false,
        failureReason: 'No accessible image URL for multimodal analysis',
        processingTimeMs: Date.now() - started,
      };
    }

    const laterality = (input.laterality ?? 'UNKNOWN') as 'OD' | 'OS' | 'OU' | 'UNKNOWN';
    const priorHint = input.patientContext?.includes('prior')
      ? 'If prior imaging context is present, describe possible interval change cautiously and require provider confirmation. Never claim progression as fact.'
      : 'If no prior imaging context is available, set priorComparison.available=false and summary="No prior image available for comparison."';

    const userPrompt = `Modality: ${input.modality}
Laterality: ${laterality}
${modalityInstructions(input.modality)}

Patient context (correlation only — do not invent chart data):
${input.patientContext ?? 'Not provided'}

${priorHint}

Return ONLY JSON with this exact shape:
{
  "status": "review_support",
  "title": "AI Image Analysis for Provider Review",
  "disclaimer": "${IMAGING_SAFETY_DISCLAIMER}",
  "imageOverview": {
    "imageType": "${input.modality}",
    "eye": "${laterality}",
    "imageQuality": "",
    "visibleRegion": "",
    "limitations": []
  },
  "appearsToSee": [],
  "possibleObservations": [
    {
      "observation": "",
      "region": "",
      "confidence": "low | medium | high",
      "whyFlagged": "",
      "providerShouldInspect": ""
    }
  ],
  "areasToInspect": [],
  "priorComparison": { "available": false, "summary": "No prior image available for comparison." },
  "suggestedReviewSteps": [],
  "providerSignoffRequired": true
}

Rules for content:
- appearsToSee: cautious sentences about what may be visible.
- possibleObservations: only possible observations for provider review (never diagnoses).
- suggestedReviewSteps: provider review steps only (compare priors, OCT/RNFL, VA/IOP/exam correlation, retake if poor quality, document provider interpretation). Never suggest treatment.
- areasToInspect: optic nerve, macula, vessels, periphery if visible, hemorrhages/exudates if visible, media opacity/artifact, image quality limitations, prior comparison if available.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: visionModel,
          response_format: { type: 'json_object' },
          max_tokens: 3000,
          temperature: 0.1,
          messages: [
            { role: 'system', content: DESCRIPTIVE_SYSTEM },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: input.signedImageUrl, detail: 'high' } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          analysisStatus: 'failed',
          modelName: visionModel,
          modelVersion: 'n/a',
          intendedUse: 'AI image analysis for provider review — not a diagnosis',
          supportedFindings: [],
          possibleFindings: [],
          limitations: ['Multimodal provider request failed.'],
          outOfDistribution: false,
          requiresManualReview: true,
          reviewPriority: 'routine',
          isDevelopmentMock: false,
          failureReason: `Provider HTTP ${response.status}: ${errText.slice(0, 120)}`,
          processingTimeMs: Date.now() - started,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty model response');
      }

      const parsed = JSON.parse(content);
      const validated = providerReviewImageAnalysisSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          analysisStatus: 'failed',
          modelName: visionModel,
          modelVersion: 'n/a',
          intendedUse: 'AI image analysis for provider review — not a diagnosis',
          supportedFindings: [],
          possibleFindings: [],
          limitations: ['Model response failed schema validation.'],
          outOfDistribution: false,
          requiresManualReview: true,
          reviewPriority: 'routine',
          isDevelopmentMock: false,
          failureReason: 'Invalid structured response from model',
          processingTimeMs: Date.now() - started,
        };
      }

      const analysis = {
        ...validated.data,
        disclaimer: validated.data.disclaimer || IMAGING_SAFETY_DISCLAIMER,
        title: 'AI Image Analysis for Provider Review',
        status: 'review_support' as const,
        providerSignoffRequired: true as const,
      };

      const review = providerReviewToDescriptive(analysis, {
        modelName: visionModel,
        modality: input.modality,
        laterality,
        modelVersion: data.model ?? visionModel,
      });

      if (
        review.analysisStatus === 'not_gradable' ||
        !review.quality.descriptiveAnalysisAllowed
      ) {
        return {
          analysisStatus: 'skipped',
          modelName: review.modelName,
          modelVersion: review.modelVersion ?? 'n/a',
          intendedUse: 'AI image analysis for provider review — not a diagnosis',
          supportedFindings: [],
          possibleFindings: [],
          limitations: review.aiNotesForProvider.limitations,
          outOfDistribution: false,
          requiresManualReview: true,
          reviewPriority: mapPriority(review.reviewPriority),
          isDevelopmentMock: false,
          rawProviderResponse: review as unknown as Record<string, unknown>,
          processingTimeMs: Date.now() - started,
        };
      }

      return {
        analysisStatus: 'complete',
        modelName: review.modelName,
        modelVersion: review.modelVersion ?? 'n/a',
        intendedUse: 'AI image analysis for provider review — not a diagnosis',
        supportedFindings: review.possibleAreasForReview.map((a) => a.label),
        possibleFindings: toNormalizedFindings(review),
        limitations: review.aiNotesForProvider.limitations,
        outOfDistribution: false,
        requiresManualReview: true,
        reviewPriority: mapPriority(review.reviewPriority),
        isDevelopmentMock: false,
        rawProviderResponse: review as unknown as Record<string, unknown>,
        processingTimeMs: Date.now() - started,
      };
    } catch (err) {
      return {
        analysisStatus: 'failed',
        modelName: visionModel,
        modelVersion: 'n/a',
        intendedUse: 'AI image analysis for provider review — not a diagnosis',
        supportedFindings: [],
        possibleFindings: [],
        limitations: ['Analysis request failed or timed out.'],
        outOfDistribution: false,
        requiresManualReview: true,
        reviewPriority: 'routine',
        isDevelopmentMock: false,
        failureReason: err instanceof Error ? err.message : 'Unknown error',
        processingTimeMs: Date.now() - started,
      };
    }
  },
};
