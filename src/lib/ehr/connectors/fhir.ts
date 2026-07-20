import 'server-only';
import type { EhrIntegration } from '@prisma/client';
import type { EhrConnector, SyncPayload, SyncResult } from '../connector';

/**
 * FHIR R4 connector skeleton. Performs real HTTP when baseUrl + credentials
 * are configured; otherwise returns a safe configuration error.
 */
export const fhirConnector: EhrConnector = {
  method: 'FHIR',
  displayName: 'FHIR R4',

  async testConnection(integration: EhrIntegration): Promise<SyncResult> {
    if (!integration.baseUrl) {
      return {
        status: 'error',
        message: 'FHIR base URL is required. Add it in integration settings.',
        recordsOk: 0,
        recordsFailed: 0,
      };
    }

    try {
      const res = await fetch(`${integration.baseUrl.replace(/\/$/, '')}/metadata`, {
        headers: buildHeaders(integration),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return {
          status: 'error',
          message: `FHIR metadata request failed (${res.status})`,
          recordsOk: 0,
          recordsFailed: 1,
        };
      }
      const meta = await res.json();
      return {
        status: 'ok',
        message: `Connected to FHIR server (${meta.software?.name ?? 'unknown'})`,
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
    if (!integration.baseUrl) {
      return {
        status: 'error',
        message: 'FHIR base URL not configured',
        recordsOk: 0,
        recordsFailed: payload.records,
      };
    }

    if (payload.resource !== 'Patient' || payload.direction !== 'INBOUND') {
      return {
        status: 'placeholder',
        message: `${payload.resource} ${payload.direction} sync not yet implemented for FHIR`,
        recordsOk: 0,
        recordsFailed: 0,
      };
    }

    try {
      const url = `${integration.baseUrl.replace(/\/$/, '')}/Patient?_count=${Math.min(payload.records, 50)}`;
      const res = await fetch(url, {
        headers: buildHeaders(integration),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        return { status: 'error', message: `FHIR Patient search failed (${res.status})`, recordsOk: 0, recordsFailed: payload.records };
      }
      const bundle = await res.json();
      const entries = bundle.entry?.length ?? 0;
      return {
        status: entries > 0 ? 'partial' : 'ok',
        message: `Fetched ${entries} patient resource(s). Import mapping runs in syncIntegration action.`,
        recordsOk: entries,
        recordsFailed: 0,
        envelope: bundle,
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

function buildHeaders(integration: EhrIntegration): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/fhir+json',
  };
  const checklist = integration.setupChecklist as { accessToken?: string; apiKey?: string } | null;
  if (checklist?.accessToken) headers.Authorization = `Bearer ${checklist.accessToken}`;
  if (checklist?.apiKey) headers['X-API-Key'] = checklist.apiKey;
  return headers;
}
