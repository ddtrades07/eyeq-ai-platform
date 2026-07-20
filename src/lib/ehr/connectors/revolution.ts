import 'server-only';
import type { EhrIntegration } from '@prisma/client';
import type { EhrConnector, SyncPayload, SyncResult } from '../connector';

/**
 * RevolutionEHR REST connector (read-only pilot).
 * Performs real HTTP when baseUrl + API key are in setupChecklist.
 */
export const revolutionEhrConnector: EhrConnector = {
  method: 'API_NATIVE',
  displayName: 'RevolutionEHR',

  async testConnection(integration: EhrIntegration): Promise<SyncResult> {
    const creds = readCreds(integration);
    if (!creds.apiKey || !creds.baseUrl) {
      return {
        status: 'error',
        message: 'RevolutionEHR API URL and API key required in integration checklist.',
        recordsOk: 0,
        recordsFailed: 0,
      };
    }

    try {
      const res = await fetch(`${creds.baseUrl}/api/v1/practice`, {
        headers: authHeaders(creds.apiKey),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return {
          status: 'error',
          message: `RevolutionEHR API returned ${res.status}`,
          recordsOk: 0,
          recordsFailed: 1,
        };
      }
      return {
        status: 'ok',
        message: 'Connected to RevolutionEHR API',
        recordsOk: 1,
        recordsFailed: 0,
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
        recordsOk: 0,
        recordsFailed: 1,
      };
    }
  },

  async sync(integration: EhrIntegration, payload: SyncPayload): Promise<SyncResult> {
    const creds = readCreds(integration);
    if (!creds.apiKey || !creds.baseUrl) {
      return {
        status: 'error',
        message: 'RevolutionEHR credentials not configured',
        recordsOk: 0,
        recordsFailed: payload.records,
      };
    }

    if (payload.resource !== 'Patient' || payload.direction !== 'INBOUND') {
      return {
        status: 'placeholder',
        message: `${payload.resource} ${payload.direction} not yet implemented for RevolutionEHR`,
        recordsOk: 0,
        recordsFailed: 0,
      };
    }

    try {
      const limit = Math.min(payload.records, 50);
      const res = await fetch(`${creds.baseUrl}/api/v1/patients?limit=${limit}`, {
        headers: authHeaders(creds.apiKey),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        return {
          status: 'error',
          message: `Patient list failed (${res.status})`,
          recordsOk: 0,
          recordsFailed: payload.records,
        };
      }
      const data = await res.json();
      const patients = Array.isArray(data.patients) ? data.patients : data.data ?? [];
      return {
        status: patients.length > 0 ? 'partial' : 'ok',
        message: `Fetched ${patients.length} patient(s) from RevolutionEHR`,
        recordsOk: patients.length,
        recordsFailed: 0,
        envelope: { patients, vendor: 'REVOLUTION_EHR' },
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
        recordsOk: 0,
        recordsFailed: payload.records,
      };
    }
  },
};

function readCreds(integration: EhrIntegration) {
  const checklist = integration.setupChecklist as {
    apiKey?: string;
    baseUrl?: string;
    accessToken?: string;
  } | null;
  return {
    apiKey: checklist?.apiKey ?? checklist?.accessToken,
    baseUrl: integration.baseUrl ?? checklist?.baseUrl,
  };
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
}
