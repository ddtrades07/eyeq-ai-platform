import 'server-only';

import { db } from '@/lib/db';
import { withPerfLog } from '@/lib/perf/log';

const OVERVIEW_APPT_TAKE = 8;
const OVERVIEW_NOTE_TAKE = 8;
const OVERVIEW_IMAGING_TAKE = 6;
const OVERVIEW_RX_TAKE = 8;
const OVERVIEW_GAP_TAKE = 8;
const OVERVIEW_MSG_TAKE = 5;
const OVERVIEW_DOC_TAKE = 5;
const OVERVIEW_SCRIBE_TAKE = 5;

/**
 * Lightweight patient chart payload for first paint.
 * Heavy tab bodies (full SOAP, imaging AI arrays) are deferred to tab loaders.
 */
export async function getPatientChartOverview(organizationId: string, patientId: string) {
  return withPerfLog(
    { route: 'query.patient-chart-overview', organizationId, meta: { patientId: 'redacted' } },
    async () => {
      const patient = await db.patient.findFirst({
        where: { id: patientId, organizationId, archivedAt: null },
        select: {
          id: true,
          organizationId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          email: true,
          phone: true,
          hasDiabetes: true,
          hasHypertension: true,
          hasGlaucomaPersonal: true,
          hasGlaucomaFamily: true,
          isSmoker: true,
          preferredLanguage: true,
          insuranceCarrier: true,
          communicationPref: {
            select: {
              smsOptIn: true,
              emailOptIn: true,
              portalOptIn: true,
              preferredChannel: true,
              optOutAt: true,
            },
          },
          appointments: {
            orderBy: { startsAt: 'desc' },
            take: OVERVIEW_APPT_TAKE,
            select: {
              id: true,
              startsAt: true,
              type: true,
              status: true,
              provider: {
                select: { user: { select: { firstName: true, lastName: true } } },
              },
              encounter: { select: { id: true, status: true } },
            },
          },
          clinicalNotes: {
            orderBy: { createdAt: 'desc' },
            take: OVERVIEW_NOTE_TAKE,
            select: {
              id: true,
              type: true,
              status: true,
              createdAt: true,
              signedAt: true,
              chiefComplaint: true,
              // Assessment snippet only for intelligence cards — full SOAP loads on Notes tab.
              assessment: true,
              appointmentId: true,
            },
          },
          imagingCases: {
            orderBy: { capturedAt: 'desc' },
            take: OVERVIEW_IMAGING_TAKE,
            select: {
              id: true,
              imageType: true,
              laterality: true,
              studyStatus: true,
              status: true,
              aiUrgency: true,
              capturedAt: true,
              needsFollowUp: true,
            },
          },
          prescriptions: {
            orderBy: { issuedAt: 'desc' },
            take: OVERVIEW_RX_TAKE,
            select: {
              id: true,
              type: true,
              status: true,
              issuedAt: true,
              expiresAt: true,
              signedAt: true,
              providerName: true,
              odSphere: true,
              odCyl: true,
              odAxis: true,
              odAdd: true,
              osSphere: true,
              osCyl: true,
              osAxis: true,
              osAdd: true,
              modality: true,
              odBrand: true,
              osBrand: true,
              odPower: true,
              osPower: true,
              notes: true,
            },
          },
          careGaps: {
            orderBy: { dueDate: 'asc' },
            take: OVERVIEW_GAP_TAKE,
            select: {
              id: true,
              type: true,
              status: true,
              dueDate: true,
              reason: true,
              suggestedAction: true,
              priority: true,
            },
          },
          messageThreads: {
            orderBy: { updatedAt: 'desc' },
            take: OVERVIEW_MSG_TAKE,
            select: {
              id: true,
              subject: true,
              isInternal: true,
              updatedAt: true,
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, createdAt: true, readStatus: true },
              },
            },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
            take: OVERVIEW_DOC_TAKE,
            select: {
              id: true,
              kind: true,
              fileName: true,
              createdAt: true,
            },
          },
          scribeSessions: {
            orderBy: { createdAt: 'desc' },
            take: OVERVIEW_SCRIBE_TAKE,
            select: {
              id: true,
              reviewStatus: true,
              createdAt: true,
              chiefComplaint: true,
              provider: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      return patient;
    },
  );
}

/** Paginated clinical notes for chart Notes tab. */
export async function listPatientNotesPage(
  organizationId: string,
  patientId: string,
  opts?: { take?: number; skip?: number },
) {
  const take = Math.min(opts?.take ?? 20, 50);
  const skip = opts?.skip ?? 0;
  return db.clinicalNote.findMany({
    where: { organizationId, patientId },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      signedAt: true,
      chiefComplaint: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      legacySummary: true,
      appointmentId: true,
      author: { select: { firstName: true, lastName: true } },
      signedBy: { select: { firstName: true, lastName: true } },
    },
  });
}

/** Paginated imaging for chart Imaging tab — metadata only (no full AI arrays). */
export async function listPatientImagingPage(
  organizationId: string,
  patientId: string,
  opts?: { take?: number; skip?: number },
) {
  const take = Math.min(opts?.take ?? 20, 50);
  const skip = opts?.skip ?? 0;
  return db.imagingCase.findMany({
    where: { organizationId, patientId, archivedAt: null },
    orderBy: { capturedAt: 'desc' },
    take,
    skip,
    select: {
      id: true,
      imageType: true,
      laterality: true,
      studyStatus: true,
      status: true,
      aiUrgency: true,
      capturedAt: true,
      needsFollowUp: true,
    },
  });
}
