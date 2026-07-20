/**
 * Structured imaging review, delegates to imaging orchestrator.
 * Legacy mock/chart-context findings removed from production path.
 */
import 'server-only';
import { runImagingOrchestrator } from './services/imaging-orchestrator';

export async function runStructuredReview(args: {
  imagingCaseId: string;
  organizationId: string;
  userId?: string;
}) {
  return runImagingOrchestrator(args);
}
