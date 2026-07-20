import 'server-only';
import { serverEnv } from '@/lib/env';
import type {
  StructuredImagingReview,
  ImageQualityAssessment,
  PossibleFinding,
  FindingConfidence,
  FindingSeverity,
  ImageTypeTemplate,
  FundusReviewTemplate,
  OctReviewTemplate,
  VisualFieldReviewTemplate,
  SlitLampReviewTemplate,
  TopographyReviewTemplate,
} from './types';

const VISION_SYSTEM_PROMPT = `You are an ophthalmic imaging review support assistant built into EyeQ AI.

CRITICAL SAFETY RULES, YOU MUST FOLLOW THESE:
- You do NOT diagnose disease. You identify possible areas of concern for provider review.
- Use hedging language: "possible", "suggestive of", "may indicate", "consider evaluating", "appearance consistent with"
- NEVER state definitive diagnoses like "this patient HAS glaucoma", say "findings may be suggestive of glaucomatous changes"
- Always recommend provider review for any finding
- Include confidence levels for each finding (low, moderate, high)
- Flag when image quality is insufficient for reliable assessment
- You CANNOT replace clinical examination

Respond with STRICT JSON matching this schema. Do not include any text outside the JSON:
{
  "quality": {
    "score": <number 0-100>,
    "gradable": <boolean>,
    "focus": "sharp" | "acceptable" | "soft" | "poor",
    "brightness": "optimal" | "bright" | "dark" | "very-dark",
    "contrast": "good" | "fair" | "low",
    "centeredAnatomy": <boolean>,
    "fieldOfView": "full" | "partial" | "limited",
    "artifacts": [<string>],
    "limitingFactors": [<string>],
    "recommendation": "proceed" | "retake-recommended" | "retake-required"
  },
  "findings": [
    {
      "finding": <string, concise name>,
      "evidence": [<string, what in the image supports this>],
      "confidence": "low" | "moderate" | "high",
      "severity": "minimal" | "mild" | "moderate" | "significant",
      "nextStep": <string, recommended follow-up>,
      "providerActionNeeded": <boolean>
    }
  ],
  "templateObservations": {
    <key>: <string observation for each field relevant to image type>
  },
  "overallUrgency": "routine" | "review-soon" | "same-day" | "urgent-referral",
  "overallConfidence": "low" | "moderate" | "high",
  "summary": <string, 1-2 sentence overall impression>,
  "providerAttentionAreas": [<string>]
}`;

function buildUserPrompt(args: {
  imageType: string;
  patientContext: string;
}): string {
  const { imageType, patientContext } = args;
  return `Analyze this ${imageType.replace(/_/g, ' ').toLowerCase()} image for review support.

Patient context:
${patientContext}

Provide your structured analysis focusing on:
1. Image quality assessment (is this gradable?)
2. Possible findings visible in the image (with evidence from what you see)
3. Type-specific observations for a ${imageType.replace(/_/g, ' ').toLowerCase()}
4. Overall urgency and confidence
5. Areas requiring provider attention

Remember: use cautious language, cite what you observe, never diagnose.`;
}

interface VisionAnalysisResult {
  quality: ImageQualityAssessment;
  findings: PossibleFinding[];
  templateObservations: Record<string, string>;
  overallUrgency: 'routine' | 'review-soon' | 'same-day' | 'urgent-referral';
  overallConfidence: FindingConfidence;
  summary: string;
  providerAttentionAreas: string[];
}

/**
 * Send an image to OpenAI GPT-4o Vision for clinical review support.
 * Falls back to null on any error so callers can use mock logic.
 */
export async function analyzeImageWithVision(args: {
  imageUrl: string;
  imageType: string;
  patientContext: string;
}): Promise<VisionAnalysisResult | null> {
  const apiKey = serverEnv.openaiApiKey;
  if (!apiKey) return null;

  try {
    const model = serverEnv.openaiModel || 'gpt-4o';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildUserPrompt(args) },
              {
                type: 'image_url',
                image_url: { url: args.imageUrl, detail: 'high' },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Vision] OpenAI API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return normalizeVisionResponse(parsed, args.imageType);
  } catch (err) {
    console.error('[Vision] Analysis failed, falling back to mock:', err instanceof Error ? err.message : err);
    return null;
  }
}

function normalizeVisionResponse(raw: Record<string, unknown>, imageType: string): VisionAnalysisResult {
  const q = raw.quality as Record<string, unknown> | undefined;
  const quality: ImageQualityAssessment = {
    gradable: Boolean(q?.gradable ?? true),
    score: clamp(Number(q?.score ?? 70), 0, 100),
    focus: validEnum(['sharp', 'acceptable', 'soft', 'poor'], q?.focus, 'acceptable'),
    brightness: validEnum(['optimal', 'bright', 'dark', 'very-dark'], q?.brightness, 'optimal'),
    contrast: validEnum(['good', 'fair', 'low'], q?.contrast, 'fair'),
    centeredAnatomy: Boolean(q?.centeredAnatomy ?? true),
    fieldOfView: validEnum(['full', 'partial', 'limited'], q?.fieldOfView, 'full'),
    artifacts: asStringArray(q?.artifacts),
    limitingFactors: asStringArray(q?.limitingFactors),
    recommendation: validEnum(['proceed', 'retake-recommended', 'retake-required'], q?.recommendation, 'proceed'),
  };

  const rawFindings = Array.isArray(raw.findings) ? raw.findings : [];
  const findings: PossibleFinding[] = rawFindings.map((f: Record<string, unknown>, i: number) => ({
    id: `vision-${i}`,
    finding: String(f.finding ?? 'Unspecified finding'),
    evidence: asStringArray(f.evidence),
    confidence: validEnum<FindingConfidence>(['low', 'moderate', 'high'], f.confidence, 'low'),
    severity: validEnum<FindingSeverity>(['minimal', 'mild', 'moderate', 'significant'], f.severity, 'mild'),
    nextStep: String(f.nextStep ?? 'Provider review recommended.'),
    providerActionNeeded: Boolean(f.providerActionNeeded ?? true),
  }));

  const templateObservations = (raw.templateObservations as Record<string, string>) ?? {};

  return {
    quality,
    findings,
    templateObservations,
    overallUrgency: validEnum(
      ['routine', 'review-soon', 'same-day', 'urgent-referral'],
      raw.overallUrgency,
      'routine',
    ),
    overallConfidence: validEnum<FindingConfidence>(['low', 'moderate', 'high'], raw.overallConfidence, 'moderate'),
    summary: String(raw.summary ?? 'AI analysis complete, provider review required.'),
    providerAttentionAreas: asStringArray(raw.providerAttentionAreas),
  };
}

/**
 * Map templateObservations from GPT into a typed ImageTypeTemplate.
 */
export function buildTemplateFromVision(
  imageType: string,
  obs: Record<string, string>,
): ImageTypeTemplate {
  const placeholder = 'Provider to evaluate, AI did not provide specific observation.';
  const get = (key: string) => obs[key] || placeholder;

  switch (imageType) {
    case 'FUNDUS':
      return {
        type: 'FUNDUS',
        template: {
          opticDiscAppearance: get('opticDiscAppearance'),
          cupToDiscConcern: get('cupToDiscConcern'),
          maculaAppearance: get('maculaAppearance'),
          vesselChanges: get('vesselChanges'),
          hemorrhageExudateFindings: get('hemorrhageExudateFindings'),
          peripheralRetinaVisibility: get('peripheralRetinaVisibility'),
          diabeticRetinopathyLike: get('diabeticRetinopathyLike'),
          hypertensiveRetinopathyLike: get('hypertensiveRetinopathyLike'),
          amdLikeMacularChanges: get('amdLikeMacularChanges'),
        } satisfies FundusReviewTemplate,
      };
    case 'OCT':
      return {
        type: 'OCT',
        template: {
          scanQuality: get('scanQuality'),
          macularContour: get('macularContour'),
          fluidLikePattern: get('fluidLikePattern'),
          rnflTrend: get('rnflTrend'),
          ganglionCellComplex: get('ganglionCellComplex'),
          segmentationArtifact: get('segmentationArtifact'),
          macularEdemaConcern: get('macularEdemaConcern'),
          glaucomaProgressionConcern: get('glaucomaProgressionConcern'),
        } satisfies OctReviewTemplate,
      };
    case 'VISUAL_FIELD':
      return {
        type: 'VISUAL_FIELD',
        template: {
          reliabilityIndices: get('reliabilityIndices'),
          fixationLosses: get('fixationLosses'),
          falsePositives: get('falsePositives'),
          falseNegatives: get('falseNegatives'),
          patternDefectConcern: get('patternDefectConcern'),
          glaucomaLikeFieldDefect: get('glaucomaLikeFieldDefect'),
          repeatTestRecommendation: get('repeatTestRecommendation'),
        } satisfies VisualFieldReviewTemplate,
      };
    case 'SLIT_LAMP':
    case 'EXTERNAL_PHOTO':
      return {
        type: imageType === 'SLIT_LAMP' ? 'SLIT_LAMP' : 'EXTERNAL_PHOTO',
        template: {
          rednessPattern: get('rednessPattern'),
          cornealOpacityConcern: get('cornealOpacityConcern'),
          lidMarginConcern: get('lidMarginConcern'),
          cataractLensOpacity: get('cataractLensOpacity'),
          conjunctivalAbnormality: get('conjunctivalAbnormality'),
        } satisfies SlitLampReviewTemplate,
      };
    case 'TOPOGRAPHY':
      return {
        type: 'TOPOGRAPHY',
        template: {
          irregularAstigmatismConcern: get('irregularAstigmatismConcern'),
          keratoconusScreening: get('keratoconusScreening'),
          progressionPlaceholder: get('progressionPlaceholder'),
          contactLensFittingRelevance: get('contactLensFittingRelevance'),
        } satisfies TopographyReviewTemplate,
      };
    default:
      return { type: 'OTHER', template: null };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function validEnum<T extends string>(valid: T[], val: unknown, fallback: T): T {
  return valid.includes(val as T) ? (val as T) : fallback;
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string');
}
