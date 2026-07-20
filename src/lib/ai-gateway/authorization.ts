import 'server-only';
import type { AiRequestType, Role } from '@prisma/client';
import { hasPermission } from '@/lib/auth/rbac';
import { AIGatewayError } from './types';

const CLINICAL_REQUEST_TYPES: ReadonlySet<AiRequestType> = new Set([
  'CHART_SUMMARY',
  'SCRIBE_NOTE_GENERATION',
  'SCRIBE_TRANSCRIPTION',
  'IMAGING_ANALYSIS',
  'PATIENT_INSTRUCTIONS',
  'REFERRAL_DRAFT',
]);

const PATIENT_ALLOWED_TYPES: ReadonlySet<AiRequestType> = new Set([
  'ASSISTANT_CHAT',
  'PLATFORM_HELP',
]);

export function authorizeAIRequest(args: {
  role: Role;
  requestType: AiRequestType;
  hasPatientContext: boolean;
}): void {
  if (args.role === 'PATIENT') {
    if (!PATIENT_ALLOWED_TYPES.has(args.requestType)) {
      throw new AIGatewayError('Patients cannot access this AI feature.', 'FORBIDDEN', 403);
    }
    if (!hasPermission(args.role, 'portal:self')) {
      throw new AIGatewayError('Patient portal access required.', 'FORBIDDEN', 403);
    }
    return;
  }

  if (!hasPermission(args.role, 'ai:use')) {
    throw new AIGatewayError('AI features are not enabled for your role.', 'FORBIDDEN', 403);
  }

  if (CLINICAL_REQUEST_TYPES.has(args.requestType)) {
    if (!hasPermission(args.role, 'ai:clinical')) {
      throw new AIGatewayError('Clinical AI features are not enabled for your role.', 'FORBIDDEN', 403);
    }
  }

  if (args.hasPatientContext && !hasPermission(args.role, 'patients:read')) {
    throw new AIGatewayError('Patient chart access required.', 'FORBIDDEN', 403);
  }
}
