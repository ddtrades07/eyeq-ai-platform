import 'server-only';
import type { EhrConnectorMethod, EhrIntegration, EhrSyncDirection } from '@prisma/client';

/**
 * Common interface every EHR connector implements. The platform talks
 * to this interface only, concrete vendor wiring lives in
 * `./connectors/*` and can be swapped without rippling through the
 * feature layer.
 *
 * No real network calls happen yet. Each connector returns
 * `{ status: 'placeholder' }` and emits a structured "would call"
 * envelope so we can review what would have been sent.
 */
export type SyncPayload = {
  resource: 'Patient' | 'Appointment' | 'Encounter' | 'Observation' | 'DiagnosticReport' | 'DocumentReference' | 'MedicationRequest' | 'ServiceRequest';
  direction: EhrSyncDirection;
  records: number;
  metadata?: Record<string, unknown>;
};

export type SyncResult = {
  status: 'placeholder' | 'ok' | 'partial' | 'error';
  message: string;
  recordsOk: number;
  recordsFailed: number;
  envelope?: Record<string, unknown>;
};

export interface EhrConnector {
  readonly method: EhrConnectorMethod;
  readonly displayName: string;
  testConnection(integration: EhrIntegration): Promise<SyncResult>;
  sync(integration: EhrIntegration, payload: SyncPayload): Promise<SyncResult>;
}

/**
 * Generic placeholder used for every vendor until real wiring lands.
 * It is intentionally type-safe + structured so we can audit what we'd
 * call without ever hitting a vendor.
 */
function placeholderConnector(method: EhrConnectorMethod, displayName: string): EhrConnector {
  return {
    method,
    displayName,
    async testConnection(integration) {
      return {
        status: 'placeholder',
        message: `${displayName} test-connection is a placeholder. Vendor approval + credentials required.`,
        recordsOk: 0,
        recordsFailed: 0,
        envelope: {
          method,
          vendor: integration.vendor,
          baseUrl: integration.baseUrl,
          scopes: integration.scopes,
        },
      };
    },
    async sync(integration, payload) {
      return {
        status: 'placeholder',
        message: `${displayName} ${payload.resource} ${payload.direction} sync is a placeholder.`,
        recordsOk: 0,
        recordsFailed: 0,
        envelope: {
          method,
          vendor: integration.vendor,
          payload,
        },
      };
    },
  };
}

import { fhirConnector } from './connectors/fhir';
import { csvImportConnector } from './connectors/csv-import';
import { revolutionEhrConnector } from './connectors/revolution';

const REGISTRY: Record<EhrConnectorMethod, EhrConnector> = {
  FHIR: fhirConnector,
  SMART_ON_FHIR: placeholderConnector('SMART_ON_FHIR', 'SMART on FHIR'),
  HL7_V2: placeholderConnector('HL7_V2', 'HL7 v2'),
  CSV_IMPORT: csvImportConnector,
  API_NATIVE: placeholderConnector('API_NATIVE', 'Vendor REST API'),
  MANUAL_UPLOAD: csvImportConnector,
};

export function getConnector(method: EhrConnectorMethod): EhrConnector {
  return REGISTRY[method];
}

/** Vendor-aware connector selection (e.g. RevolutionEHR over generic API_NATIVE stub). */
export function getConnectorForIntegration(integration: Pick<EhrIntegration, 'vendor' | 'connectorMethod'>): EhrConnector {
  if (integration.vendor === 'REVOLUTION_EHR') {
    return revolutionEhrConnector;
  }
  return getConnector(integration.connectorMethod);
}
