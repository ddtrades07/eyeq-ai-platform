import type { AiRequestType, AiProviderVendor, PhiRiskLevel, Role } from '@prisma/client';

export type AIAttachment = {
  type: 'image' | 'audio' | 'document' | 'dicom';
  storagePath?: string;
  mimeType?: string;
  fileName?: string;
};

export type AIRequestContext = {
  currentPage?: string;
  conversationId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  enrichedContext?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export type StandardAIRequest = {
  userId: string;
  practiceId: string;
  locationId?: string | null;
  role: Role;
  patientId?: string | null;
  appointmentId?: string | null;
  requestType: AiRequestType;
  requestedAction?: string;
  currentPage?: string;
  message?: string;
  attachments?: AIAttachment[];
  selectedModel?: string;
  urgency?: 'routine' | 'urgent';
  requiresProviderReview?: boolean;
  idempotencyKey?: string;
  context?: AIRequestContext;
};

export type StandardAIResponse = {
  requestId: string;
  status: 'completed' | 'blocked' | 'failed' | 'processing';
  modelUsed?: string;
  taskType: AiRequestType;
  structuredOutput?: Record<string, unknown>;
  humanReadableOutput?: string;
  confidence?: number;
  limitations?: string;
  supportingSources?: { type: string; label: string }[];
  providerReviewRequired: boolean;
  safetyFlags: string[];
  processingTimeMs: number;
  estimatedCostCents?: number;
  createdAt: string;
  phiRedacted?: boolean;
  phiMessage?: string;
  errorMessage?: string;
};

export type PHIScanResult = {
  riskLevel: PhiRiskLevel;
  detections: { fieldType: string; method: string; count: number }[];
  redactedText?: string;
  blocked: boolean;
  userMessage?: string;
};

export type ModelRouteDecision = {
  vendor: AiProviderVendor;
  model: string;
  fallbackVendor?: AiProviderVendor;
  fallbackModel?: string;
};

export type ProviderCompletionResult = {
  text: string;
  model: string;
  vendor: AiProviderVendor;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
};

export class AIGatewayError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'BLOCKED' | 'SHUTDOWN' | 'NO_PROVIDER' | 'VALIDATION' | 'PHI_BLOCKED',
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AIGatewayError';
  }
}
