/**
 * Vendor adapter interfaces. UI and domain code depend on these contracts,
 * not on specific vendors. Implementations live in subfolders per domain.
 */

export type { AIProvider, ChatMessage, CompletionOptions } from '@/lib/ai/provider';

export type TranscriptionResult = {
  text: string;
  segments: { speaker: string; startMs: number; endMs: number; text: string; confidence?: number }[];
  uncertainWords: string[];
};

export interface TranscriptionProvider {
  readonly name: string;
  isConfigured(): boolean;
  transcribe(audioUrl: string, options?: { language?: string }): Promise<TranscriptionResult>;
}

export type ImagingAnalysisResult = {
  modality: string;
  qualityGrade: string;
  findings: { label: string; confidence: number; severity?: string }[];
  providerReviewRequired: true;
  modelName: string;
  modelVersion: string;
  limitations: string[];
};

export interface ImagingAnalysisProvider {
  readonly name: string;
  isConfigured(): boolean;
  analyze(args: { studyId: string; imageUrl: string; modality: string }): Promise<ImagingAnalysisResult>;
}

export type EHRSyncResult = {
  success: boolean;
  recordsSynced: number;
  errors: string[];
};

export interface EHRIntegrationProvider {
  readonly vendor: string;
  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  syncPatients(since?: Date): Promise<EHRSyncResult>;
  syncAppointments(since?: Date): Promise<EHRSyncResult>;
}

export type EligibilityResult = {
  status: 'active' | 'inactive' | 'unknown' | 'error';
  planName?: string;
  copay?: string;
  raw?: Record<string, unknown>;
};

export interface EligibilityProvider {
  readonly name: string;
  isConfigured(): boolean;
  checkEligibility(args: { patientId: string; payerId: string }): Promise<EligibilityResult>;
}

export interface ClaimsClearinghouseProvider {
  readonly name: string;
  isConfigured(): boolean;
  submitClaim(claimId: string): Promise<{ accepted: boolean; externalId?: string; errors?: string[] }>;
  pollClaimStatus(externalId: string): Promise<{ status: string }>;
}

export type MessageDeliveryResult = {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
};

export interface MessagingProvider {
  readonly channel: 'sms';
  isConfigured(): boolean;
  send(args: { to: string; body: string; templateId?: string }): Promise<MessageDeliveryResult>;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(args: { to: string; subject: string; html: string }): Promise<MessageDeliveryResult>;
}

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  createPaymentIntent(args: {
    amountCents: number;
    patientId: string;
    metadata?: Record<string, string>;
  }): Promise<{ clientSecret?: string; error?: string }>;
}

export interface EPrescribingProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendPrescription(prescriptionId: string): Promise<{ sent: boolean; externalId?: string }>;
}

export interface StorageProvider {
  getSignedUploadUrl(args: { bucket: string; path: string; contentType: string }): Promise<string>;
  getSignedDownloadUrl(args: { bucket: string; path: string; expiresInSeconds: number }): Promise<string>;
}

export interface IdentityProvider {
  signIn(email: string, password: string): Promise<{ userId: string }>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}
