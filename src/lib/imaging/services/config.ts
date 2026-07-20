import 'server-only';

import { serverEnv } from '@/lib/env';



export type ImagingAnalysisMode =

  | 'manual'

  | 'descriptive'

  | 'external'

  | 'custom'

  | 'development-mock';



export const IMAGING_SAFETY_DISCLAIMER =
  'EyeQ AI reviewed this image and generated possible observations for provider review. This is not a diagnosis. The analysis may be incomplete or incorrect and must be confirmed by the provider.';

export const NO_PROVIDER_MESSAGE =
  'Manual review only. No validated imaging-analysis provider is configured. EyeQ AI has not generated image observations.';

export const NO_VALIDATED_PROVIDER_MESSAGE =
  'Manual review only. No validated imaging-analysis provider is configured. EyeQ AI has not generated image observations.';

export const DESCRIPTIVE_DISCLOSURE =
  'This analysis uses a general multimodal image model for provider-review support only. It is not a validated ophthalmic diagnostic system and must not be treated as a diagnosis.';



export const OUT_OF_SCOPE_MESSAGE =

  'EyeQ AI cannot assess this image using the currently configured model. Manual provider review is required.';



export function hasDescriptiveProvider(): boolean {

  return Boolean(serverEnv.openaiApiKey);

}



export function getImagingAnalysisMode(): ImagingAnalysisMode {

  const explicit = (

    process.env.IMAGING_PROVIDER_MODE ??

    process.env.IMAGING_ANALYSIS_MODE ??

    ''

  ).toLowerCase() as ImagingAnalysisMode;



  if (explicit === 'development-mock') {

    if (process.env.NODE_ENV === 'production' && process.env.IMAGING_DEV_MOCK !== 'true') {

      return 'manual';

    }

    if (process.env.NODE_ENV !== 'development' && process.env.IMAGING_DEV_MOCK !== 'true') {

      return 'manual';

    }

    return 'development-mock';

  }



  if (explicit === 'descriptive') {

    return hasDescriptiveProvider() ? 'descriptive' : 'manual';

  }



  if (explicit === 'external' || explicit === 'custom') {

    return explicit;

  }



  if (explicit === 'manual') {

    return 'manual';

  }



  // Auto: use descriptive when OpenAI vision is configured

  if (hasDescriptiveProvider() && process.env.IMAGING_AUTO_DESCRIPTIVE !== 'false') {

    return 'descriptive';

  }



  return 'manual';

}



export function isDevelopmentMockActive(): boolean {

  return getImagingAnalysisMode() === 'development-mock';

}



export function hasValidatedImagingProvider(): boolean {

  const mode = getImagingAnalysisMode();

  if (mode === 'external') {

    return Boolean(process.env.IMAGING_ANALYSIS_ENDPOINT && process.env.IMAGING_ANALYSIS_API_KEY);

  }

  if (mode === 'custom') {

    return Boolean(process.env.IMAGING_CUSTOM_ENDPOINT && process.env.IMAGING_CUSTOM_API_KEY);

  }

  return false;

}



export const imagingEnv = {

  analysisMode: getImagingAnalysisMode(),

  externalEndpoint: process.env.IMAGING_ANALYSIS_ENDPOINT ?? '',

  externalApiKey: process.env.IMAGING_ANALYSIS_API_KEY ?? '',

  customEndpoint: process.env.IMAGING_CUSTOM_ENDPOINT ?? '',

  customApiKey: process.env.IMAGING_CUSTOM_API_KEY ?? '',

  devMockEnabled: isDevelopmentMockActive(),

  descriptiveEnabled: getImagingAnalysisMode() === 'descriptive',

  openAiVisionEnabled: hasDescriptiveProvider(),

  visionModel: process.env.OPENAI_VISION_MODEL ?? serverEnv.openaiModel ?? 'gpt-4o',

};


