/**
 * Model provider abstraction for imaging analysis.
 *
 * Each model provider implements a common interface so we can
 * swap between mock, research, and FDA-cleared models without
 * changing feature code.
 *
 * INTEGRATION-READY PLACEHOLDERS:
 * - Diabetic retinopathy screening (e.g., IDx-DR integration slot)
 * - OCT analysis model (e.g., Heidelberg, Zeiss integration slot)
 * - Visual field analysis (e.g., Humphrey/Octopus integration slot)
 * - Custom research model (e.g., internal ResNet / ViT model)
 * - Manual provider-only mode (no AI, provider reviews directly)
 */

export interface ImagingModelProvider {
  readonly name: string;
  readonly modelType: 'mock' | 'research' | 'fda-cleared' | 'manual';
  readonly supportedImageTypes: string[];

  analyze(args: {
    imageType: string;
    imageUrl?: string;
    patientContext?: string;
  }): Promise<ModelAnalysisResult>;
}

export interface ModelAnalysisResult {
  findings: string[];
  confidence: 'low' | 'moderate' | 'high';
  urgency: 'routine' | 'review-soon' | 'same-day' | 'urgent-referral';
  rawOutput?: Record<string, unknown>;
}

/**
 * Mock model, deterministic, safe, no external calls.
 */
export const mockModelProvider: ImagingModelProvider = {
  name: 'EyeQ Mock Model',
  modelType: 'mock',
  supportedImageTypes: ['FUNDUS', 'OCT', 'VISUAL_FIELD', 'SLIT_LAMP', 'TOPOGRAPHY', 'EXTERNAL_PHOTO'],

  async analyze({ imageType }) {
    return {
      findings: [
        `Image type ${imageType.replace(/_/g, ' ')} processed by mock model.`,
        'No high-priority observations flagged by automated screen.',
        'Provider review and clinical correlation required. Not a diagnosis.',
      ],
      confidence: 'moderate',
      urgency: 'routine',
    };
  },
};

/**
 * PLACEHOLDER: FDA-cleared diabetic retinopathy model.
 * When integrated, this would call the vendor API and return
 * a structured DR grade (e.g., no DR, mild NPDR, moderate, severe, PDR).
 */
export const fdaDRModelPlaceholder: ImagingModelProvider = {
  name: 'DR Screening Model (placeholder)',
  modelType: 'fda-cleared',
  supportedImageTypes: ['FUNDUS'],

  async analyze() {
    throw new Error(
      'FDA-cleared DR model not yet integrated. This is an integration-ready placeholder.',
    );
  },
};

/**
 * PLACEHOLDER: OCT analysis model.
 */
export const octModelPlaceholder: ImagingModelProvider = {
  name: 'OCT Analysis Model (placeholder)',
  modelType: 'research',
  supportedImageTypes: ['OCT'],

  async analyze() {
    throw new Error(
      'OCT analysis model not yet integrated. This is an integration-ready placeholder.',
    );
  },
};

/**
 * PLACEHOLDER: Visual field analysis model.
 */
export const vfModelPlaceholder: ImagingModelProvider = {
  name: 'VF Analysis Model (placeholder)',
  modelType: 'research',
  supportedImageTypes: ['VISUAL_FIELD'],

  async analyze() {
    throw new Error(
      'Visual field model not yet integrated. This is an integration-ready placeholder.',
    );
  },
};

/**
 * Manual provider-only mode, no AI analysis, provider reviews raw image.
 */
export const manualProviderMode: ImagingModelProvider = {
  name: 'Manual Provider Review',
  modelType: 'manual',
  supportedImageTypes: ['FUNDUS', 'OCT', 'VISUAL_FIELD', 'SLIT_LAMP', 'TOPOGRAPHY', 'EXTERNAL_PHOTO'],

  async analyze() {
    return {
      findings: ['Manual review mode, no automated analysis performed.'],
      confidence: 'low' as const,
      urgency: 'routine' as const,
    };
  },
};

export function getImagingModelProvider(): ImagingModelProvider {
  return mockModelProvider;
}
