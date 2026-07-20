import {
  ConnectedEhrVendor,
  EhrConnectorMethod,
  EhrSyncDirection,
} from '@prisma/client';

/**
 * Static metadata for every vendor the EHR Integration Center can list.
 * No tokens or credentials live here, those belong in the org's vault
 * once a real integration is provisioned.
 */
export type EhrVendorEntry = {
  vendor: ConnectedEhrVendor;
  name: string;
  segment: 'hospital' | 'optometry' | 'custom';
  description: string;
  defaultMethod: EhrConnectorMethod;
  supportedMethods: EhrConnectorMethod[];
  defaultDirection: EhrSyncDirection;
  capabilities: {
    patientSync: boolean;
    appointmentSync: boolean;
    noteExport: boolean;
    prescriptionSync: boolean;
    imagingMetadataSync: boolean;
  };
  setupChecklist: { label: string }[];
  docsUrl?: string;
};

export const EHR_CATALOG: EhrVendorEntry[] = [
  {
    vendor: 'EPIC',
    name: 'Epic',
    segment: 'hospital',
    description: 'Hospital + ambulatory EHR. SMART on FHIR integration via the Epic on FHIR program.',
    defaultMethod: 'SMART_ON_FHIR',
    supportedMethods: ['SMART_ON_FHIR', 'FHIR', 'HL7_V2'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true,
      appointmentSync: true,
      noteExport: true,
      prescriptionSync: true,
      imagingMetadataSync: true,
    },
    setupChecklist: [
      { label: 'Submit Epic on FHIR application' },
      { label: 'Receive client ID + scopes from health system' },
      { label: 'Configure OAuth redirect URI in EyeQ vault' },
      { label: 'Validate against Epic sandbox' },
      { label: 'Sign BAA + production go-live with health system' },
    ],
    docsUrl: 'https://fhir.epic.com/',
  },
  {
    vendor: 'ORACLE_HEALTH_CERNER',
    name: 'Oracle Health (Cerner)',
    segment: 'hospital',
    description: 'Cerner Millennium / Oracle Health. FHIR R4 via the Code Console.',
    defaultMethod: 'FHIR',
    supportedMethods: ['FHIR', 'SMART_ON_FHIR'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: true,
    },
    setupChecklist: [
      { label: 'Register app in Oracle Health Code Console' },
      { label: 'Configure tenant + scopes' },
      { label: 'Validate against sandbox' },
      { label: 'Sign BAA' },
    ],
  },
  {
    vendor: 'ATHENAHEALTH',
    name: 'athenahealth',
    segment: 'hospital',
    description: 'athenahealth marketplace. REST + FHIR (R4).',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE', 'FHIR'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: false, imagingMetadataSync: true,
    },
    setupChecklist: [
      { label: 'Apply to the athenahealth Marketplace' },
      { label: 'Receive API key + practice ID' },
      { label: 'Map practice + department IDs' },
    ],
  },
  {
    vendor: 'ECLINICALWORKS',
    name: 'eClinicalWorks',
    segment: 'hospital',
    description: 'eClinicalWorks REST + FHIR R4.',
    defaultMethod: 'FHIR',
    supportedMethods: ['FHIR', 'API_NATIVE'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [
      { label: 'Submit interop request to eCW' },
      { label: 'Receive client credentials' },
      { label: 'Validate sandbox handshake' },
    ],
  },
  {
    vendor: 'NEXTGEN',
    name: 'NextGen',
    segment: 'hospital',
    description: 'NextGen Enterprise / Office. FHIR (R4) + Web APIs.',
    defaultMethod: 'FHIR',
    supportedMethods: ['FHIR', 'API_NATIVE'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [
      { label: 'Engage NextGen Connected Health team' },
      { label: 'Provision developer credentials' },
    ],
  },
  {
    vendor: 'DRCHRONO',
    name: 'DrChrono',
    segment: 'optometry',
    description: 'EverHealth (DrChrono). OAuth2 + REST.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: false, imagingMetadataSync: false,
    },
    setupChecklist: [
      { label: 'Register DrChrono OAuth app' },
      { label: 'Configure scopes + redirect' },
    ],
  },
  {
    vendor: 'REVOLUTION_EHR',
    name: 'RevolutionEHR',
    segment: 'optometry',
    description: 'Cloud-native optometry EHR. REST API.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE', 'CSV_IMPORT'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [
      { label: 'Request RevolutionEHR API credentials' },
      { label: 'Map practice + provider IDs' },
    ],
  },
  {
    vendor: 'EYEFINITY_OFFICEMATE',
    name: 'Eyefinity / OfficeMate',
    segment: 'optometry',
    description: 'Eyefinity EHR + OfficeMate practice management.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE', 'CSV_IMPORT'],
    defaultDirection: 'INBOUND',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: false,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [{ label: 'Engage Eyefinity API team' }],
  },
  {
    vendor: 'CRYSTAL_PM',
    name: 'Crystal PM',
    segment: 'optometry',
    description: 'Optometry practice management with imaging hand-off.',
    defaultMethod: 'CSV_IMPORT',
    supportedMethods: ['CSV_IMPORT', 'MANUAL_UPLOAD', 'API_NATIVE'],
    defaultDirection: 'INBOUND',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: false,
      prescriptionSync: false, imagingMetadataSync: true,
    },
    setupChecklist: [{ label: 'Configure scheduled CSV export' }],
  },
  {
    vendor: 'COMPULINK',
    name: 'Compulink',
    segment: 'optometry',
    description: 'Compulink Advantage SMART.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE', 'CSV_IMPORT'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [{ label: 'Open Compulink integration ticket' }],
  },
  {
    vendor: 'MAXIMEYES',
    name: 'MaximEyes',
    segment: 'optometry',
    description: 'First Insight MaximEyes.NET API.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: false,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [{ label: 'Provision MaximEyes API user' }],
  },
  {
    vendor: 'ITRUST',
    name: 'iTRUST',
    segment: 'optometry',
    description: 'iTRUST cloud EHR.',
    defaultMethod: 'API_NATIVE',
    supportedMethods: ['API_NATIVE', 'CSV_IMPORT'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: false,
    },
    setupChecklist: [{ label: 'Request iTRUST API key' }],
  },
  {
    vendor: 'CUSTOM_FHIR',
    name: 'Custom FHIR',
    segment: 'custom',
    description: 'Bring-your-own FHIR R4 server (US Core profile recommended).',
    defaultMethod: 'FHIR',
    supportedMethods: ['FHIR', 'SMART_ON_FHIR'],
    defaultDirection: 'BIDIRECTIONAL',
    capabilities: {
      patientSync: true, appointmentSync: true, noteExport: true,
      prescriptionSync: true, imagingMetadataSync: true,
    },
    setupChecklist: [
      { label: 'Provide FHIR server URL + token endpoint' },
      { label: 'Verify supported resources' },
    ],
  },
  {
    vendor: 'OTHER',
    name: 'Other / Manual',
    segment: 'custom',
    description: 'Manual upload only. Useful as a stop-gap while a real connector is built.',
    defaultMethod: 'MANUAL_UPLOAD',
    supportedMethods: ['MANUAL_UPLOAD', 'CSV_IMPORT'],
    defaultDirection: 'INBOUND',
    capabilities: {
      patientSync: true, appointmentSync: false, noteExport: false,
      prescriptionSync: false, imagingMetadataSync: false,
    },
    setupChecklist: [{ label: 'Define manual upload SOP' }],
  },
];

/**
 * Resources exposed by the Epic on FHIR program that EyeQ AI maps to
 * internal entities. Used by the Epic-specific detail panel to display
 * the integration surface.
 */
export const EPIC_FHIR_RESOURCES: { resource: string; internal: string; usage: string }[] = [
  { resource: 'Patient', internal: 'Patient', usage: 'Demographics, identifiers (MRN), insurance.' },
  { resource: 'Practitioner', internal: 'Provider', usage: 'Clinician roster + NPI.' },
  { resource: 'Appointment', internal: 'Appointment', usage: 'Bi-directional appointment sync.' },
  { resource: 'Encounter', internal: 'Appointment', usage: 'Visit context for clinical notes.' },
  { resource: 'Observation', internal: 'ClinicalNote', usage: 'Vitals, vision, IOP, refraction.' },
  { resource: 'DiagnosticReport', internal: 'ImagingCase', usage: 'Imaging reports.' },
  { resource: 'DocumentReference', internal: 'Document', usage: 'Consents, referral letters.' },
  { resource: 'MedicationRequest', internal: 'Prescription', usage: 'Optical / pharmacological Rx.' },
  { resource: 'ServiceRequest', internal: 'CareGap', usage: 'Referrals, follow-up orders.' },
];

export function getVendorEntry(vendor: ConnectedEhrVendor): EhrVendorEntry | undefined {
  return EHR_CATALOG.find((v) => v.vendor === vendor);
}

export const CONNECTOR_METHOD_LABELS: Record<EhrConnectorMethod, string> = {
  FHIR: 'FHIR (R4)',
  SMART_ON_FHIR: 'SMART on FHIR',
  HL7_V2: 'HL7 v2',
  CSV_IMPORT: 'CSV import / export',
  API_NATIVE: 'Vendor REST API',
  MANUAL_UPLOAD: 'Manual upload',
};

export const SYNC_DIRECTION_LABELS: Record<EhrSyncDirection, string> = {
  NONE: 'None',
  INBOUND: 'Inbound only',
  OUTBOUND: 'Outbound only',
  BIDIRECTIONAL: 'Bidirectional',
};

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  NOT_CONNECTED: 'Not connected',
  SANDBOX_CONNECTED: 'Sandbox connected',
  PRODUCTION_PENDING: 'Production pending',
  CONNECTED: 'Connected',
  SYNC_ERROR: 'Sync error',
};
