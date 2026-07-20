import 'server-only';
import type { EhrIntegration } from '@prisma/client';
import type { EhrConnector, SyncPayload, SyncResult } from '../connector';

/**
 * CSV import connector. Actual parsing happens in importPatientsFromCsv action;
 * this connector validates integration readiness.
 */
export const csvImportConnector: EhrConnector = {
  method: 'CSV_IMPORT',
  displayName: 'CSV import',

  async testConnection(_integration: EhrIntegration): Promise<SyncResult> {
    return {
      status: 'ok',
      message: 'CSV import ready. Upload a file from Settings → Data import.',
      recordsOk: 0,
      recordsFailed: 0,
    };
  },

  async sync(_integration: EhrIntegration, payload: SyncPayload): Promise<SyncResult> {
    return {
      status: 'placeholder',
      message: `Use importPatientsFromCsv action for ${payload.resource} CSV import.`,
      recordsOk: 0,
      recordsFailed: 0,
    };
  },
};
