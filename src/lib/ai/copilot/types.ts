import type { Role } from '@prisma/client';

/**
 * Copilot type definitions.
 *
 * The copilot is context-aware: it knows the current patient, page,
 * user role, and timeline intelligence signals. Every response carries
 * an explainability block so the user understands what data informed
 * the answer.
 */

export type CopilotRole =
  | 'provider'
  | 'front_desk'
  | 'technician'
  | 'optical'
  | 'patient'
  | 'general';

export type PageContext =
  | 'dashboard'
  | 'patient_chart'
  | 'appointments'
  | 'imaging'
  | 'care_gaps'
  | 'messages'
  | 'scheduling'
  | 'inventory'
  | 'ambient_scribe'
  | 'timeline_intelligence'
  | 'portal'
  | 'other';

/** What the UI sends per user message. */
export interface CopilotRequest {
  message: string;
  conversationId?: string;
  history: CopilotMessage[];
  context: CopilotContext;
}

/** The assembled context injected into the AI prompt. */
export interface CopilotContext {
  userRole: Role;
  copilotRole: CopilotRole;
  page: PageContext;
  organizationId: string | null;
  userId: string;
  userName: string;

  patientId?: string | null;
  patientSummary?: string | null;
  appointmentSummary?: string | null;
  imagingSummary?: string | null;
  careGapSummary?: string | null;
  timelineIntelligenceSummary?: string | null;
  prescriptionSummary?: string | null;
  recentNotesSummary?: string | null;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Explains what data the AI relied on. Only on assistant messages. */
  explainability?: ExplainabilityBlock;
  createdAt: string;
}

export interface ExplainabilityBlock {
  heading: string;
  factors: string[];
  disclaimer: string;
}

/** A canned suggestion shown in the UI. */
export interface SuggestedPrompt {
  label: string;
  prompt: string;
  category: string;
}

/** What the server action returns. */
export interface CopilotResponse {
  message: CopilotMessage;
  suggestedFollowUps: string[];
}

/** Maps Prisma Role to the CopilotRole that governs prompt + suggestions. */
export function roleToCopilotRole(role: Role): CopilotRole {
  switch (role) {
    case 'OWNER':
    case 'OPTOMETRIST':
    case 'MD':
    case 'RESIDENT':
      return 'provider';
    case 'FRONT_DESK':
      return 'front_desk';
    case 'TECHNICIAN':
    case 'SCRIBE':
      return 'technician';
    case 'OPTICAL':
      return 'optical';
    case 'PATIENT':
      return 'patient';
    default:
      return 'general';
  }
}
