import 'server-only';
import {
  AppointmentStatus,
  AppointmentType,
  CareGapStatus,
  CareGapType,
  ClaimStatus,
  ConnectedEhrVendor,
  DeliveryStatus,
  EhrConnectionStatus,
  EhrConnectorMethod,
  EhrSyncDirection,
  EncounterStatus,
  ExamChartStatus,
  ImageType,
  ImagingLaterality,
  ImagingStatus,
  InventoryActivityType,
  InventoryCategory,
  InventoryStatus,
  InvoiceStatus,
  MessageChannel,
  MessageDirection,
  MessageReadStatus,
  PrescriptionType,
  ReminderCampaignStatus,
  ReminderChannel,
  ReminderType,
  GoogleReviewReplyStatus,
  GoogleQuestionReplyStatus,
  Role,
  ScribeReviewStatus,
  ScribeSessionStatus,
  ScribeSpeaker,
  SupportedLocale,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  EyeHealthOrgReviewStatus,
  EyeHealthRecommendationContext,
} from '@prisma/client';
import { demoImagingStoragePath } from './imaging-placeholders';
import { syncEncounterForAppointment } from '@/lib/encounters/sync';
import { db } from '@/lib/db';
import {
  DEMO_ORG_NAME,
  DEMO_ORG_SLUG,
  DEMO_OWNER_EMAIL,
  DEMO_ROLE_ACCOUNTS,
} from './constants';
import { ensureAllDemoAuthUsers, syncDemoPrismaUsers } from './auth-users';

/**
 * Demo Mode provisioner.
 *
 * `ensureDemoMode()` is idempotent: if the demo org + user + dataset
 * exist, it does nothing. Otherwise it creates them. Safe to call on
 * every "Try the live demo" click.
 *
 * `resetDemoMode()` wipes the demo org and re-creates the dataset.
 * Restricted to the demo org id, never touches a real tenant.
 */

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function atHour(d: Date, h: number, m = 0): Date {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}

/**
 * Idempotently ensures the demo org and its dataset exist, and that all
 * demo role accounts are linked. Returns the demo org id.
 */
export async function ensureDemoMode(): Promise<string> {
  const authByEmail = await ensureAllDemoAuthUsers();

  let org = await db.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: DEMO_ORG_NAME,
        slug: DEMO_ORG_SLUG,
        practiceMode: 'NATIVE_EHR',
      },
    });
  } else if (org.name !== DEMO_ORG_NAME) {
    org = await db.organization.update({
      where: { id: org.id },
      data: { name: DEMO_ORG_NAME },
    });
  }

  await syncDemoPrismaUsers(org.id, authByEmail);

  await db.orgSubscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      plan: 'PRACTICE',
      billingStatus: 'MANUAL',
      providerSeatLimit: 50,
      locationSeatLimit: 20,
      activatedAt: new Date(),
      adminAlertNote: 'Demo org — payment not required',
    },
    update: {
      billingStatus: 'MANUAL',
      providerSeatLimit: 50,
      locationSeatLimit: 20,
      adminAlertNote: 'Demo org — payment not required',
    },
  });

  const patientCount = await db.patient.count({
    where: { organizationId: org.id },
  });
  if (patientCount > 0) {
    return org.id;
  }

  const owner =
    (await db.user.findUnique({ where: { email: 'owner.demo@eyeq.local' } })) ??
    (await db.user.findUnique({ where: { email: DEMO_OWNER_EMAIL } }));
  if (!owner) {
    throw new Error('Demo owner user missing after provisioning.');
  }

  await populateDemoData(org.id, owner.id);
  await syncDemoPrismaUsers(org.id, authByEmail);
  return org.id;
}

/**
 * Wipes the demo org's tenant-scoped data and re-creates it.
 * Restricted to records with `organizationId === demoOrgId`, there is
 * NO path for this to touch any other tenant.
 */
export async function resetDemoMode(): Promise<string> {
  const org = await db.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (!org) {
    return await ensureDemoMode();
  }
  if (org.name !== DEMO_ORG_NAME) {
    await db.organization.update({
      where: { id: org.id },
      data: { name: DEMO_ORG_NAME },
    });
  }
  const owner = await db.user.findFirst({
    where: { organizationId: org.id, role: Role.OWNER },
  });
  await clearDemoData(org.id);
  const authByEmail = await ensureAllDemoAuthUsers();
  await syncDemoPrismaUsers(org.id, authByEmail);
  if (owner) {
    await populateDemoData(org.id, owner.id);
    await syncDemoPrismaUsers(org.id, authByEmail);
  } else {
    // No owner left after wipe? Recreate end-to-end.
    return await ensureDemoMode();
  }
  return org.id;
}

async function clearDemoData(organizationId: string): Promise<void> {
  await db.transcriptSegment.deleteMany({
    where: { session: { organizationId } },
  });
  await db.ambientScribeSession.deleteMany({ where: { organizationId } });
  await db.examChart.deleteMany({ where: { organizationId } });
  await db.staffTask.deleteMany({ where: { organizationId } });
  await db.opticalOrder.deleteMany({ where: { organizationId } });
  await db.opticalLab.deleteMany({ where: { organizationId } });
  await db.patientForm.deleteMany({ where: { organizationId } });
  await db.encounter.deleteMany({ where: { organizationId } });
  await db.claimLine.deleteMany({ where: { claim: { organizationId } } });
  await db.claim.deleteMany({ where: { organizationId } });
  await db.patientInvoice.deleteMany({ where: { organizationId } });
  await db.messageDeliveryLog.deleteMany({ where: { organizationId } });
  await db.reminderCampaign.deleteMany({ where: { organizationId } });
  await db.reminderTemplate.deleteMany({ where: { organizationId } });
  await db.communicationPreference.deleteMany({ where: { organizationId } });
  await db.inventoryActivity.deleteMany({ where: { organizationId } });
  await db.inventoryItem.deleteMany({ where: { organizationId } });
  await db.ehrSyncLog.deleteMany({ where: { integration: { organizationId } } });
  await db.ehrIntegration.deleteMany({ where: { organizationId } });
  await db.googleReview.deleteMany({ where: { organizationId } });
  await db.googleBusinessQuestion.deleteMany({ where: { organizationId } });
  await db.googleBusinessConnection.deleteMany({ where: { organizationId } });
  await db.eyeHealthRecommendation.deleteMany({ where: { organizationId } });
  await db.eyeHealthSavedArticle.deleteMany({ where: { organizationId } });
  await db.eyeHealthOrgArticleState.deleteMany({ where: { organizationId } });
  await db.supportTicketNote.deleteMany({
    where: { ticket: { organizationId } },
  });
  await db.supportTicket.deleteMany({ where: { organizationId } });
  await db.backgroundJob.deleteMany({ where: { organizationId } });
  await db.message.deleteMany({ where: { thread: { organizationId } } });
  await db.messageThread.deleteMany({ where: { organizationId } });
  await db.careGap.deleteMany({ where: { organizationId } });
  await db.imagingCase.deleteMany({ where: { organizationId } });
  await db.clinicalNote.deleteMany({ where: { organizationId } });
  await db.prescription.deleteMany({ where: { organizationId } });
  await db.appointment.deleteMany({ where: { organizationId } });
  await db.document.deleteMany({ where: { organizationId } });
  await db.patient.deleteMany({ where: { organizationId } });

  // Keep demo role accounts; only remove orphan staff rows if any exist.
  const preserveEmails = [
    ...DEMO_ROLE_ACCOUNTS.map((a) => a.email),
    DEMO_OWNER_EMAIL,
  ];
  await db.provider.deleteMany({ where: { organizationId } });
  await db.location.deleteMany({ where: { organizationId } });
  await db.user.deleteMany({
    where: {
      organizationId,
      email: { notIn: preserveEmails },
    },
  });
}

/**
 * Populates the demo org with a rich, deterministic dataset:
 * - 2 locations, 4 staff users + providers
 * - 12 patients spanning glaucoma, DM, dry eye, CL, pediatric, post-op, etc.
 * - 30+ appointments (past/today/future, varied statuses, including no-shows)
 * - 18 imaging cases with varied AI flags including progression
 * - 18 signed clinical notes with chief complaints + plans
 * - 9 prescriptions (some expired)
 * - 11 care gaps (DUE + OVERDUE)
 * - 3 message threads with mixed read state
 * - Encounters + exam chart for in-clinic visit
 * - Inventory, billing, recalls, ambient scribe, EHR sandbox row
 */
async function populateDemoData(organizationId: string, ownerId: string): Promise<void> {
  const today = atHour(new Date(), 0, 0);

  // ----- Locations -----
  const [mainLoc, northLoc, westLoc] = await Promise.all([
    db.location.create({
      data: {
        organizationId,
        name: `${DEMO_ORG_NAME}, Downtown`,
        shortName: 'Downtown',
        addressLine1: '100 Visionary Blvd',
        city: 'Austin',
        region: 'TX',
        postalCode: '78701',
        isPrimary: true,
        rooms: 5,
      },
    }),
    db.location.create({
      data: {
        organizationId,
        name: `${DEMO_ORG_NAME}, Northside`,
        shortName: 'Northside',
        addressLine1: '850 Aurora Pkwy',
        city: 'Round Rock',
        region: 'TX',
        postalCode: '78664',
        rooms: 3,
      },
    }),
    db.location.create({
      data: {
        organizationId,
        name: `${DEMO_ORG_NAME}, West Clinic`,
        shortName: 'West',
        addressLine1: '420 Lakeview Dr',
        city: 'Bee Cave',
        region: 'TX',
        postalCode: '78738',
        rooms: 4,
      },
    }),
  ]);
  const southLoc = westLoc;

  // Demo role accounts (Supabase-linked) seeded by syncDemoPrismaUsers.
  const odUser = await db.user.findUniqueOrThrow({
    where: { email: 'optometrist.demo@eyeq.local' },
  });
  const techUser = await db.user.findUniqueOrThrow({
    where: { email: 'technician.demo@eyeq.local' },
  });
  const fdUser = await db.user.findUniqueOrThrow({
    where: { email: 'frontdesk.demo@eyeq.local' },
  });

  // Additional non-login staff for a realistic multi-provider team. These
  // users have no Supabase auth identity (placeholder id) and are recreated
  // on reset via clearDemoData's notIn filter.
  const evanUser = await db.user.upsert({
    where: { email: 'evan.brooks.demo@eyeq.local' },
    create: {
      supabaseUserId: `demo-evan-brooks-${organizationId}`,
      email: 'evan.brooks.demo@eyeq.local',
      firstName: 'Evan',
      lastName: 'Brooks',
      role: Role.OPTOMETRIST,
      organizationId,
      defaultOrganizationId: organizationId,
    },
    update: { organizationId, defaultOrganizationId: organizationId, isActive: true },
  });
  await db.user.upsert({
    where: { email: 'carlos.ramirez.demo@eyeq.local' },
    create: {
      supabaseUserId: `demo-carlos-ramirez-${organizationId}`,
      email: 'carlos.ramirez.demo@eyeq.local',
      firstName: 'Carlos',
      lastName: 'Ramirez',
      role: Role.TECHNICIAN,
      organizationId,
      defaultOrganizationId: organizationId,
    },
    update: { organizationId, defaultOrganizationId: organizationId, isActive: true },
  });
  const mdUser = evanUser;

  // ----- Providers -----
  const odProvider = await db.provider.create({
    data: {
      organizationId,
      userId: odUser.id,
      credentials: 'OD, FAAO',
      title: 'Lead Optometrist',
      locations: { connect: [{ id: mainLoc.id }, { id: southLoc.id }] },
    },
  });
  const mdProvider = await db.provider.create({
    data: {
      organizationId,
      userId: mdUser.id,
      credentials: 'OD',
      title: 'Optometrist',
      locations: { connect: [{ id: mainLoc.id }, { id: northLoc.id }] },
    },
  });
  const ownerProvider = await db.provider.create({
    data: {
      organizationId,
      userId: ownerId,
      credentials: 'OD',
      title: 'Owner / Primary OD',
      locations: { connect: [{ id: mainLoc.id }] },
    },
  });

  // ----- Patients -----
  type PatientSpec = {
    firstName: string;
    lastName: string;
    dob: string;
    insuranceCarrier: string;
    phone: string;
    hasDiabetes?: boolean;
    hasHypertension?: boolean;
    hasGlaucomaPersonal?: boolean;
    hasGlaucomaFamily?: boolean;
    isSmoker?: boolean;
  };
  // Demo patient cast. Index positions carry connected story data below
  // (appointments, imaging, notes, billing), so keep this order stable.
  const patientSpecs: PatientSpec[] = [
    // 0 — Featured connected journey: glaucoma suspect follow-up
    { firstName: 'Michael', lastName: 'Thompson', dob: '1958-03-12', hasGlaucomaPersonal: true, hasHypertension: true, insuranceCarrier: 'Medicare', phone: '555-100-1001' },
    // 1 — Diabetic eye exam (checked in / in pretest today)
    { firstName: 'James', lastName: 'Wilson', dob: '1972-09-04', hasDiabetes: true, insuranceCarrier: 'BlueCross', phone: '555-100-1002' },
    // 2 — Dry eye evaluation
    { firstName: 'Emily', lastName: 'Chen', dob: '1985-06-22', insuranceCarrier: 'VSP', phone: '555-100-1003' },
    // 3 — Outstanding balance + optical order
    { firstName: 'Daniel', lastName: 'Kim', dob: '1965-11-30', hasGlaucomaFamily: true, hasHypertension: true, insuranceCarrier: 'EyeMed', phone: '555-100-1004' },
    // 4 — Contact lens follow-up
    { firstName: 'Sofia', lastName: 'Garcia', dob: '1990-01-19', insuranceCarrier: 'VSP', phone: '555-100-1005' },
    // 5 — Postoperative follow-up
    { firstName: 'Robert', lastName: 'Hall', dob: '1948-07-08', hasHypertension: true, insuranceCarrier: 'Medicare', phone: '555-100-1006' },
    // 6 — Pediatric myopia visit
    { firstName: 'Aarav', lastName: 'Mehta', dob: '2016-04-14', insuranceCarrier: 'BlueCross', phone: '555-100-1007' },
    // 7 — Routine comprehensive eye exam
    { firstName: 'Rina', lastName: 'Desai', dob: '1979-12-02', insuranceCarrier: 'Aetna', phone: '555-100-1008' },
    // 8 — Missing intake forms
    { firstName: 'Maria', lastName: 'Lopez', dob: '1994-08-25', insuranceCarrier: 'VSP', phone: '555-100-1009' },
    // 9 — Urgent red eye appointment
    { firstName: 'Linda', lastName: 'Brooks', dob: '1953-02-17', insuranceCarrier: 'Medicare', phone: '555-100-1010' },
    // 10 — Background: upcoming comprehensive
    { firstName: 'Lucia', lastName: 'Martinez', dob: '1981-10-09', insuranceCarrier: 'Cigna', phone: '555-100-1011' },
    // 11 — Background: diabetic recall
    { firstName: 'Wendell', lastName: 'Park', dob: '1969-05-28', hasDiabetes: true, hasHypertension: true, insuranceCarrier: 'Medicare', phone: '555-100-1012' },
  ];

  const patients = await Promise.all(
    patientSpecs.map((p) =>
      db.patient.create({
        data: {
          organizationId,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(p.dob),
          email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase().replace(/[^a-z]/g, '')}@demo.eyeqai.app`,
          phone: p.phone,
          insuranceCarrier: p.insuranceCarrier,
          insuranceStatus: 'Verified',
          hasDiabetes: p.hasDiabetes ?? false,
          hasHypertension: p.hasHypertension ?? false,
          hasGlaucomaPersonal: p.hasGlaucomaPersonal ?? false,
          hasGlaucomaFamily: p.hasGlaucomaFamily ?? false,
          isSmoker: p.isSmoker ?? false,
        },
      }),
    ),
  );

  // ----- Appointments -----
  const apptPlans: Array<{
    patientIdx: number;
    type: AppointmentType;
    when: Date;
    status: AppointmentStatus;
    providerId: string;
    locationId: string;
    reason?: string;
  }> = [
    // ----- TODAY -----
    {
      patientIdx: 0,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(today, 9),
      status: AppointmentStatus.CONFIRMED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
      reason: 'Glaucoma 3-month IOP check',
    },
    {
      patientIdx: 1,
      type: AppointmentType.DIABETIC_EYE_EXAM,
      when: atHour(today, 10),
      status: AppointmentStatus.CHECKED_IN,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
      reason: 'Annual diabetic eye exam',
    },
    {
      patientIdx: 2,
      type: AppointmentType.DRY_EYE_FOLLOWUP,
      when: atHour(today, 11),
      status: AppointmentStatus.WITH_DOCTOR,
      providerId: odProvider.id,
      locationId: mainLoc.id,
      reason: 'Dry eye follow-up, ready for provider',
    },
    {
      patientIdx: 9,
      type: AppointmentType.WALK_IN,
      when: atHour(today, 11, 30),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
      reason: 'Walk-in red eye concern',
    },
    {
      patientIdx: 3,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(today, 13),
      status: AppointmentStatus.SCHEDULED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
      reason: 'Annual comprehensive',
    },
    {
      patientIdx: 4,
      type: AppointmentType.CONTACT_LENS_EXAM,
      when: atHour(today, 14),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: southLoc.id,
      reason: 'CL renewal',
    },
    {
      patientIdx: 5,
      type: AppointmentType.MEDICAL_OFFICE_VISIT,
      when: atHour(today, 8),
      status: AppointmentStatus.COMPLETED,
      providerId: mdProvider.id,
      locationId: mainLoc.id,
      reason: 'Completed morning cataract check',
    },
    {
      patientIdx: 6,
      type: AppointmentType.PEDIATRIC,
      when: atHour(today, 16),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
      reason: 'Pediatric screening, first glasses',
    },
    // ----- HISTORICAL -----
    {
      patientIdx: 0,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(addDays(today, -90), 10),
      status: AppointmentStatus.NO_SHOW,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 0,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(addDays(today, -180), 10),
      status: AppointmentStatus.COMPLETED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 2,
      type: AppointmentType.DRY_EYE_FOLLOWUP,
      when: atHour(addDays(today, -45), 11),
      status: AppointmentStatus.COMPLETED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 2,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(addDays(today, -120), 11),
      status: AppointmentStatus.COMPLETED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 1,
      type: AppointmentType.DIABETIC_EYE_EXAM,
      when: atHour(addDays(today, -400), 9),
      status: AppointmentStatus.COMPLETED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 4,
      type: AppointmentType.CONTACT_LENS_EXAM,
      when: atHour(addDays(today, -300), 14),
      status: AppointmentStatus.COMPLETED,
      providerId: odProvider.id,
      locationId: southLoc.id,
    },
    {
      patientIdx: 5,
      type: AppointmentType.MEDICAL_OFFICE_VISIT,
      when: atHour(addDays(today, -200), 15),
      status: AppointmentStatus.COMPLETED,
      providerId: mdProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 7,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(addDays(today, -60), 13),
      status: AppointmentStatus.COMPLETED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 7,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(addDays(today, -395), 13),
      status: AppointmentStatus.NO_SHOW,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 8,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(addDays(today, -30), 13),
      status: AppointmentStatus.COMPLETED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 9,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(addDays(today, -75), 10),
      status: AppointmentStatus.NO_SHOW,
      providerId: mdProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 11,
      type: AppointmentType.DIABETIC_EYE_EXAM,
      when: atHour(addDays(today, -380), 9),
      status: AppointmentStatus.COMPLETED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    // ----- UPCOMING -----
    {
      patientIdx: 1,
      type: AppointmentType.DIABETIC_EYE_EXAM,
      when: atHour(addDays(today, 7), 9),
      status: AppointmentStatus.SCHEDULED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 8,
      type: AppointmentType.CONTACT_LENS_EXAM,
      when: atHour(addDays(today, 14), 11),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientIdx: 10,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(addDays(today, 21), 13),
      status: AppointmentStatus.SCHEDULED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
  ];

  const createdAppointments: Array<{
    id: string;
    patientIdx: number;
    status: AppointmentStatus;
    providerId: string;
    locationId: string;
  }> = [];

  for (const plan of apptPlans) {
    const appt = await db.appointment.create({
      data: {
        organizationId,
        locationId: plan.locationId,
        patientId: patients[plan.patientIdx].id,
        providerId: plan.providerId,
        type: plan.type,
        status: plan.status,
        startsAt: plan.when,
        endsAt: new Date(plan.when.getTime() + 45 * 60 * 1000),
        durationMinutes: 45,
        reason: plan.reason,
        complexity: plan.type === AppointmentType.GLAUCOMA_FOLLOWUP ? 'High' : 'Moderate',
        noShowRiskScore: plan.status === AppointmentStatus.NO_SHOW ? 0.7 : 0.2,
      },
    });
    createdAppointments.push({
      id: appt.id,
      patientIdx: plan.patientIdx,
      status: plan.status,
      providerId: plan.providerId,
      locationId: plan.locationId,
    });
  }

  // Sync encounters for today's board + recent completed visits used in timeline demos.
  for (const appt of createdAppointments) {
    const activeToday =
      appt.status !== AppointmentStatus.CANCELLED &&
      (appt.status !== AppointmentStatus.NO_SHOW || appt.patientIdx === 9);
    const isCompletedStory = appt.status === AppointmentStatus.COMPLETED;
    if (!activeToday && !isCompletedStory) continue;

    await syncEncounterForAppointment({
      appointmentId: appt.id,
      organizationId,
      patientId: patients[appt.patientIdx].id,
      locationId: appt.locationId,
      providerId: appt.providerId,
      status: appt.status,
      createdById: ownerId,
    });
  }

  const jamesTodayAppt = createdAppointments.find(
    (a) => a.patientIdx === 1 && a.status === AppointmentStatus.CHECKED_IN,
  );
  if (jamesTodayAppt) {
    const jamesEncounter = await db.encounter.findUnique({
      where: { appointmentId: jamesTodayAppt.id },
    });
    if (jamesEncounter) {
      await db.encounter.update({
        where: { id: jamesEncounter.id },
        data: {
          status: EncounterStatus.IN_PRETEST,
          checkedInAt: atHour(today, 9, 45),
          pretestStartedAt: atHour(today, 9, 50),
        },
      });
      await db.examChart.create({
        data: {
          organizationId,
          encounterId: jamesEncounter.id,
          patientId: patients[1].id,
          providerId: ownerProvider.id,
          status: ExamChartStatus.IN_PROGRESS,
          sectionData: {
            chief_complaint: 'Annual diabetic eye exam',
            hpi: 'Type 2 diabetes, last A1C 7.1. No vision changes. Taking metformin.',
            visual_acuity: 'OD 20/25 cc, OS 20/20 cc',
            iop: 'OD 16 mmHg, OS 15 mmHg',
            dilation: '1% tropicamide OU — pending',
            slit_lamp: 'Lids/lashes WNL, conj clear, cornea clear OU',
            fundus: 'Pending dilation',
            assessment: 'Diabetes mellitus — annual screening in progress',
            plan: 'Complete dilated exam. Coordinate A1C with PCP if overdue.',
          },
        },
      });
    }
  }

  // ----- Imaging cases -----
  type ImagingPlan = {
    patientIdx: number;
    type: ImageType;
    daysAgo: number;
    laterality: ImagingLaterality;
    flags: string[];
    urgency: string;
    notes: string[];
    status: ImagingStatus;
    trend?: string;
    providerNote?: string;
    fileName?: string;
  };

  const imagingPlans: ImagingPlan[] = [
    // Michael Thompson, OCT RNFL OD progression series (3 studies)
    {
      patientIdx: 0,
      type: ImageType.OCT,
      daysAgo: 174,
      laterality: ImagingLaterality.OD,
      fileName: 'Cirrus HD-OCT RNFL OD',
      flags: ['mild RNFL thinning superior'],
      urgency: 'routine',
      notes: ['Baseline RNFL thickness within normal limits.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      trend: 'baseline',
      providerNote:
        'Baseline RNFL OD within expected range. Continue glaucoma suspect monitoring.',
    },
    {
      patientIdx: 0,
      type: ImageType.OCT,
      daysAgo: 100,
      laterality: ImagingLaterality.OD,
      fileName: 'Cirrus HD-OCT RNFL OD',
      flags: ['RNFL thinning superior', 'cup-to-disc 0.6'],
      urgency: 'review-soon',
      notes: ['Possible progression compared to baseline, provider review recommended.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      trend: 'mild change',
      providerNote:
        'RNFL thinning superior OD compared with baseline. Correlate with IOP and visual field.',
    },
    {
      patientIdx: 0,
      type: ImageType.OCT,
      daysAgo: 0,
      laterality: ImagingLaterality.OD,
      fileName: 'Cirrus HD-OCT RNFL OD',
      flags: ['RNFL thinning superior + inferior', 'cup-to-disc 0.65', 'asymmetry vs OS'],
      urgency: 'review-soon',
      notes: [
        'Multiple flagged signals, possible progression suggestive of glaucomatous change.',
        'Provider review recommended; compare side-by-side with prior studies.',
      ],
      status: ImagingStatus.AI_REVIEWED,
      trend: 'progression suspect',
      providerNote:
        'RNFL shows superior thinning compared with prior baseline. Correlate with optic nerve appearance, IOP history, and visual field testing. Continue glaucoma suspect monitoring.',
    },
    // Michael Thompson, VF OD
    {
      patientIdx: 0,
      type: ImageType.VISUAL_FIELD,
      daysAgo: 0,
      laterality: ImagingLaterality.OD,
      fileName: 'Humphrey 24-2 OD',
      flags: ['superior arcuate defect, verify'],
      urgency: 'review-soon',
      notes: ['VF defect consistent with prior OCT findings, provider review recommended.'],
      status: ImagingStatus.AI_REVIEWED,
    },
    // James Wilson, diabetic fundus OU
    {
      patientIdx: 1,
      type: ImageType.FUNDUS,
      daysAgo: 400,
      laterality: ImagingLaterality.OU,
      fileName: 'Optos widefield OU',
      flags: [],
      urgency: 'routine',
      notes: ['No diabetic retinopathy signs at baseline.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      providerNote: 'No diabetic retinopathy at baseline OU.',
    },
    {
      patientIdx: 1,
      type: ImageType.FUNDUS,
      daysAgo: 1,
      laterality: ImagingLaterality.OU,
      fileName: 'Optos widefield OU',
      flags: ['microaneurysms, verify', 'possible dot hemorrhages'],
      urgency: 'review-soon',
      notes: [
        'Findings suggestive of early non-proliferative changes, provider review recommended.',
      ],
      status: ImagingStatus.AI_REVIEWED,
    },
    // Emily Chen, dry eye topography OU
    {
      patientIdx: 2,
      type: ImageType.TOPOGRAPHY,
      daysAgo: 45,
      laterality: ImagingLaterality.OU,
      fileName: 'Corneal topography OU',
      flags: ['irregular tear film'],
      urgency: 'routine',
      notes: ['Topography supports dry eye evaluation.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      providerNote: 'Topography supports dry eye workup. No keratoconus pattern.',
    },
    // Daniel Kim, fundus baseline OU
    {
      patientIdx: 3,
      type: ImageType.FUNDUS,
      daysAgo: 30,
      laterality: ImagingLaterality.OU,
      fileName: 'Fundus photo OU',
      flags: [],
      urgency: 'routine',
      notes: ['Routine baseline, unremarkable.'],
      status: ImagingStatus.PROVIDER_SIGNED,
    },
    // Robert Hall, post-op macular OCT OS
    {
      patientIdx: 5,
      type: ImageType.OCT,
      daysAgo: 30,
      laterality: ImagingLaterality.OS,
      fileName: 'Cirrus HD-OCT macula OS',
      flags: [],
      urgency: 'routine',
      notes: ['Post-op macular OCT, no cystoid macular edema.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      providerNote: 'Post-op macular OCT OS, no cystoid macular edema.',
    },
    {
      patientIdx: 5,
      type: ImageType.OCT,
      daysAgo: 5,
      laterality: ImagingLaterality.OS,
      fileName: 'Cirrus HD-OCT macula OS',
      flags: [],
      urgency: 'routine',
      notes: ['Macula flat, recovery on track.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      providerNote: 'Macula flat OS. Recovery on track after cataract surgery.',
    },
    // Linda Brooks, external photo OD (red eye)
    {
      patientIdx: 9,
      type: ImageType.EXTERNAL_PHOTO,
      daysAgo: 75,
      laterality: ImagingLaterality.OD,
      fileName: 'External photo OD',
      flags: [],
      urgency: 'routine',
      notes: ['External photo documents conjunctival injection, right eye.'],
      status: ImagingStatus.PROVIDER_SIGNED,
      providerNote: 'Conjunctival injection OD consistent with viral conjunctivitis.',
    },
    // Wendell Park, diabetic fundus OU
    {
      patientIdx: 11,
      type: ImageType.FUNDUS,
      daysAgo: 380,
      laterality: ImagingLaterality.OU,
      fileName: 'Fundus photo OU',
      flags: ['microaneurysms'],
      urgency: 'review-soon',
      notes: ['Possible non-proliferative diabetic findings, provider review recommended.'],
      status: ImagingStatus.PROVIDER_SIGNED,
    },
    // Aarav Mehta, pediatric external OU
    {
      patientIdx: 6,
      type: ImageType.EXTERNAL_PHOTO,
      daysAgo: 0,
      laterality: ImagingLaterality.OU,
      fileName: 'External photo OU',
      flags: [],
      urgency: 'routine',
      notes: ['Pediatric external, anatomy unremarkable.'],
      status: ImagingStatus.AWAITING_AI,
    },
    // Sofia Garcia, slit lamp OU
    {
      patientIdx: 4,
      type: ImageType.SLIT_LAMP,
      daysAgo: 1,
      laterality: ImagingLaterality.OU,
      fileName: 'Slit lamp anterior segment OU',
      flags: ['mild MGD signs, verify'],
      urgency: 'routine',
      notes: ['Possible MGD, provider review recommended.'],
      status: ImagingStatus.AI_REVIEWED,
    },
  ];

  for (const i of imagingPlans) {
    const isSigned = i.status === ImagingStatus.PROVIDER_SIGNED;
    await db.imagingCase.create({
      data: {
        organizationId,
        patientId: patients[i.patientIdx].id,
        uploaderId: techUser.id,
        imageType: i.type,
        laterality: i.laterality,
        storagePath: demoImagingStoragePath(i.type),
        fileName: i.fileName ?? `demo-${i.type.toLowerCase()}.svg`,
        mimeType: 'image/svg+xml',
        capturedAt: addDays(today, -i.daysAgo),
        status: i.status,
        aiQuality: 'good',
        aiAnatomyDetected: ['optic disc', 'macula'],
        aiFlags: i.flags,
        aiUrgency: i.urgency,
        aiConfidence: 'moderate',
        aiNotes: i.notes,
        aiInvokedAt: i.status === ImagingStatus.AWAITING_AI ? null : addDays(today, -i.daysAgo),
        aiProvider: 'mock',
        signedById: isSigned ? ownerId : null,
        signedAt: isSigned ? addDays(today, -Math.max(0, i.daysAgo - 1)) : null,
        providerNote: i.providerNote ?? (isSigned ? 'Reviewed, stable / per plan.' : null),
        trend: i.trend ?? null,
      },
    });
  }

  // ----- Patient documents (demo placeholders) -----
  await db.document.createMany({
    data: [
      {
        organizationId,
        patientId: patients[0].id,
        uploadedById: techUser.id,
        kind: 'INSURANCE_CARD',
        storagePath: '/demo/images/documents/insurance-card.svg',
        fileName: 'insurance-card-demo.pdf',
        mimeType: 'image/svg+xml',
      },
      {
        organizationId,
        patientId: patients[0].id,
        uploadedById: techUser.id,
        kind: 'PHOTO_ID',
        storagePath: '/demo/images/documents/id-card.svg',
        fileName: 'photo-id-demo.pdf',
        mimeType: 'image/svg+xml',
      },
      {
        organizationId,
        patientId: patients[8].id,
        uploadedById: techUser.id,
        kind: 'INTAKE_FORM',
        storagePath: '/demo/images/documents/intake-form.svg',
        fileName: 'intake-form-pending.pdf',
        mimeType: 'image/svg+xml',
      },
      {
        organizationId,
        patientId: patients[0].id,
        uploadedById: odUser.id,
        kind: 'REFERRAL',
        storagePath: '/demo/images/documents/referral-letter.svg',
        fileName: 'glaucoma-referral-demo.pdf',
        mimeType: 'image/svg+xml',
      },
      {
        organizationId,
        patientId: patients[3].id,
        uploadedById: techUser.id,
        kind: 'STATEMENT',
        storagePath: '/demo/images/documents/statement.svg',
        fileName: 'patient-statement-demo.pdf',
        mimeType: 'image/svg+xml',
      },
    ],
  });

  // ----- Clinical notes -----
  type NoteSpec = {
    patientIdx: number;
    daysAgo: number;
    type: string;
    chiefComplaint: string;
    subjective?: string;
    objective?: string;
    assessment: string;
    plan: string;
    signed: boolean;
  };
  const notes: NoteSpec[] = [
    // Maria (glaucoma)
    {
      patientIdx: 0,
      daysAgo: 180,
      type: 'Glaucoma follow-up',
      chiefComplaint: 'glaucoma surveillance, no new symptoms',
      assessment: 'Primary open-angle glaucoma, stable per imaging.',
      plan: 'Continue latanoprost qhs OU. Follow-up in 3 months. Recheck IOP and repeat OCT.',
      signed: true,
    },
    {
      patientIdx: 0,
      daysAgo: 380,
      type: 'Comprehensive',
      chiefComplaint: 'glaucoma management',
      subjective: 'Reports good adherence to drops.',
      objective: 'Dilated exam performed. Cup-to-disc 0.55 OD / 0.5 OS.',
      assessment: 'POAG, stable.',
      plan: 'Continue current therapy. Annual visual field.',
      signed: true,
    },
    // James (DM)
    {
      patientIdx: 1,
      daysAgo: 400,
      type: 'Diabetic eye exam',
      chiefComplaint: 'annual DM eye exam',
      assessment: 'No diabetic retinopathy at this time.',
      plan: 'Continue annual diabetic eye exam. Maintain A1C goals with PCP.',
      signed: true,
    },
    // Priya (dry eye), 4 visits with repeated chief complaint
    {
      patientIdx: 2,
      daysAgo: 240,
      type: 'Office visit',
      chiefComplaint: 'dry eye burning end of day',
      assessment: 'Evaporative dry eye, mild.',
      plan: 'Preservative-free artificial tears qid. Warm compresses bid. RTC 6 weeks.',
      signed: true,
    },
    {
      patientIdx: 2,
      daysAgo: 180,
      type: 'Dry eye follow-up',
      chiefComplaint: 'dry eye, still burning',
      assessment: 'Persistent evaporative dry eye.',
      plan: 'Add cyclosporine 0.05% bid. Continue tears and compresses. Deferred meibomian probing.',
      signed: true,
    },
    {
      patientIdx: 2,
      daysAgo: 120,
      type: 'Dry eye follow-up',
      chiefComplaint: 'dry eye not improving',
      assessment: 'Dry eye with persistent symptoms despite cyclosporine.',
      plan: 'Discuss in-office expression options at next visit.',
      signed: true,
    },
    {
      patientIdx: 2,
      daysAgo: 45,
      type: 'Dry eye follow-up',
      chiefComplaint: 'dry eye burning, worse with screens',
      assessment: 'Chronic evaporative dry eye, considering escalation.',
      plan: 'Order tear film analysis. Patient previously declined imaging at last visit, re-offer today.',
      signed: true,
    },
    // David, comprehensive
    {
      patientIdx: 3,
      daysAgo: 60,
      type: 'Comprehensive',
      chiefComplaint: 'annual exam',
      assessment: 'Stable. Family history of glaucoma, surveillance ongoing.',
      plan: 'Annual OCT for glaucoma screening. RTC 12 months.',
      signed: true,
    },
    // Robert Hall (postoperative follow-up)
    {
      patientIdx: 5,
      daysAgo: 30,
      type: 'Postoperative visit',
      chiefComplaint: 'one-month follow-up after cataract surgery, right eye',
      subjective: 'Reports clearer vision, no pain or flashes. Using prescribed drops.',
      objective: 'Posterior chamber IOL well centered OD. Cornea clear, mild residual inflammation.',
      assessment: 'Uncomplicated recovery after cataract surgery, right eye.',
      plan: 'Taper steroid drops over 2 weeks. Update spectacle Rx at next visit. RTC 1 month.',
      signed: true,
    },
    // Owen (smoker)
    {
      patientIdx: 7,
      daysAgo: 60,
      type: 'Comprehensive',
      chiefComplaint: 'blurred vision at distance',
      assessment: 'Mild myopia progression. Patient continues to smoke, counseled on macular health risk.',
      plan: 'Update Rx. RTC 12 months.',
      signed: true,
    },
    // Aiyana, CL exam
    {
      patientIdx: 8,
      daysAgo: 30,
      type: 'CL exam',
      chiefComplaint: 'CL renewal, comfort decreasing end of day',
      assessment: 'CL-related dryness.',
      plan: 'Trial daily disposable lenses. RTC 2 weeks. Follow-up in 1 month for renewal.',
      signed: true,
    },
    // Linda Brooks (urgent red eye)
    {
      patientIdx: 9,
      daysAgo: 75,
      type: 'Office visit',
      chiefComplaint: 'red, watery right eye for two days',
      subjective: 'Redness and watering OD, mild irritation, no pain or vision loss.',
      objective: 'Diffuse conjunctival injection OD, no corneal staining, clear anterior chamber.',
      assessment: 'Acute viral conjunctivitis, right eye.',
      plan: 'Supportive care, cool compresses, strict hygiene. Return if pain or vision changes.',
      signed: true,
    },
    // Wendell, DM
    {
      patientIdx: 11,
      daysAgo: 380,
      type: 'Diabetic eye exam',
      chiefComplaint: 'annual DM eye exam',
      assessment: 'Mild NPDR, both eyes.',
      plan: 'Dilated retinal exam annually. Coordinate with PCP regarding A1C.',
      signed: true,
    },
    // Michael Thompson — unsigned draft for today's visit (provider sign-off required)
    {
      patientIdx: 0,
      daysAgo: 0,
      type: 'SOAP',
      chiefComplaint: 'glaucoma follow-up, IOP check',
      subjective: 'Reports good drop adherence. No new flashes or floaters.',
      objective: 'Awaiting today\'s IOP and OCT comparison.',
      assessment: 'Draft only. Provider review required before sign-off.',
      plan: 'Draft plan pending exam completion.',
      signed: false,
    },
  ];

  for (const n of notes) {
    await db.clinicalNote.create({
      data: {
        organizationId,
        patientId: patients[n.patientIdx].id,
        authorId: odUser.id,
        signedById: n.signed ? ownerId : null,
        signedAt: n.signed ? addDays(today, -n.daysAgo) : null,
        type: n.type,
        status: n.signed ? 'SIGNED' : 'DRAFT',
        chiefComplaint: n.chiefComplaint,
        subjective: n.subjective ?? null,
        objective: n.objective ?? null,
        assessment: n.assessment,
        plan: n.plan,
        createdAt: addDays(today, -n.daysAgo),
      },
    });
  }

  // ----- Prescriptions -----
  await db.prescription.createMany({
    data: [
      // Maria, current Rx
      {
        organizationId,
        patientId: patients[0].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -180),
        expiresAt: addDays(today, 185),
        providerName: 'Dr. Arjun Patel, OD',
        odSphere: '+1.25', odCyl: '-0.50', odAxis: '90', odAdd: '+2.00',
        osSphere: '+1.50', osCyl: '-0.25', osAxis: '85', osAdd: '+2.00',
        pd: '62',
      },
      // James, expired
      {
        organizationId,
        patientId: patients[1].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -800),
        expiresAt: addDays(today, -60),
        providerName: 'Dr. Arjun Patel, OD',
        odSphere: '-1.50', osSphere: '-1.50',
      },
      // Priya, current
      {
        organizationId,
        patientId: patients[2].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -120),
        expiresAt: addDays(today, 245),
        providerName: 'Dr. Maya Shah, OD',
        odSphere: '-2.00', osSphere: '-2.25',
      },
      // Aiyana, CL with lapse pattern
      {
        organizationId,
        patientId: patients[8].id,
        type: PrescriptionType.CONTACTS,
        issuedAt: addDays(today, -800),
        expiresAt: addDays(today, -430),
        providerName: 'Dr. Maya Shah, OD',
        modality: 'Daily',
        odBrand: 'Acuvue Oasys 1-Day', odBc: '8.5', odDia: '14.3', odPower: '-2.75',
        osBrand: 'Acuvue Oasys 1-Day', osBc: '8.5', osDia: '14.3', osPower: '-3.00',
      },
      {
        organizationId,
        patientId: patients[8].id,
        type: PrescriptionType.CONTACTS,
        issuedAt: addDays(today, -380),
        expiresAt: addDays(today, -10),
        providerName: 'Dr. Maya Shah, OD',
        modality: 'Daily',
        odBrand: 'Acuvue Oasys 1-Day', odBc: '8.5', odDia: '14.3', odPower: '-3.00',
        osBrand: 'Acuvue Oasys 1-Day', osBc: '8.5', osDia: '14.3', osPower: '-3.25',
      },
      // Sofia, current CL
      {
        organizationId,
        patientId: patients[4].id,
        type: PrescriptionType.CONTACTS,
        issuedAt: addDays(today, -90),
        expiresAt: addDays(today, 275),
        providerName: 'Dr. Maya Shah, OD',
        modality: 'Daily',
        odBrand: 'Dailies Total 1', odBc: '8.5', odDia: '14.1', odPower: '-2.00',
        osBrand: 'Dailies Total 1', osBc: '8.5', osDia: '14.1', osPower: '-2.25',
      },
      // Owen, expired glasses
      {
        organizationId,
        patientId: patients[7].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -700),
        expiresAt: addDays(today, -335),
        providerName: 'Dr. Arjun Patel, OD',
        odSphere: '-1.75', osSphere: '-2.00',
      },
      // David, current
      {
        organizationId,
        patientId: patients[3].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -60),
        expiresAt: addDays(today, 305),
        providerName: 'Dr. Arjun Patel, OD',
        odSphere: '+0.75', odAdd: '+1.50',
        osSphere: '+1.00', osAdd: '+1.50',
      },
    ],
  });

  // ----- Care gaps -----
  await db.careGap.createMany({
    data: [
      {
        organizationId,
        patientId: patients[0].id,
        type: CareGapType.GLAUCOMA_FOLLOWUP_OVERDUE,
        status: CareGapStatus.OVERDUE,
        priority: 0,
        dueDate: addDays(today, -30),
        reason: 'Patient missed prior glaucoma follow-up.',
        suggestedAction: 'Personal outreach; confirm IOP recheck.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[1].id,
        type: CareGapType.DIABETIC_FOLLOWUP_OVERDUE,
        status: CareGapStatus.DUE,
        priority: 1,
        dueDate: addDays(today, 7),
        reason: 'Annual diabetic eye exam interval reached.',
        suggestedAction: 'Confirm today\'s visit and schedule next year.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[2].id,
        type: CareGapType.DRY_EYE_FOLLOWUP_OVERDUE,
        status: CareGapStatus.DUE,
        priority: 2,
        dueDate: addDays(today, 14),
        reason: 'Symptomatic dry eye still unresolved across 4 visits.',
        suggestedAction: 'Escalate treatment discussion at follow-up.',
        assignedRole: Role.OPTOMETRIST,
      },
      {
        organizationId,
        patientId: patients[7].id,
        type: CareGapType.ANNUAL_EXAM_OVERDUE,
        status: CareGapStatus.OVERDUE,
        priority: 1,
        dueDate: addDays(today, -90),
        reason: 'Annual comprehensive interval exceeded; patient is also a smoker.',
        suggestedAction: 'SMS + phone outreach to schedule.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[8].id,
        type: CareGapType.CL_RX_EXPIRING,
        status: CareGapStatus.DUE,
        priority: 1,
        dueDate: addDays(today, 10),
        reason: 'Contact lens prescription expiring within 14 days; prior lapse history.',
        suggestedAction: 'Proactive recall for CL fit.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[0].id,
        type: CareGapType.IMAGING_REVIEW_OVERDUE,
        status: CareGapStatus.DUE,
        priority: 1,
        dueDate: addDays(today, 3),
        reason: 'Latest OCT reviewed by EyeQ, awaiting provider sign-off.',
        suggestedAction: 'Provider review of latest OCT before today\'s visit.',
        assignedRole: Role.OPTOMETRIST,
      },
      {
        organizationId,
        patientId: patients[9].id,
        type: CareGapType.NO_SHOW_NOT_RESCHEDULED,
        status: CareGapStatus.OVERDUE,
        priority: 1,
        dueDate: addDays(today, -45),
        reason: 'Missed red eye recheck; not rescheduled.',
        suggestedAction: 'Outreach to confirm symptoms resolved.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[11].id,
        type: CareGapType.DIABETIC_FOLLOWUP_OVERDUE,
        status: CareGapStatus.OVERDUE,
        priority: 0,
        dueDate: addDays(today, -120),
        reason: 'Diabetic eye exam interval exceeded > 12 months.',
        suggestedAction: 'Urgent recall outreach.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId,
        patientId: patients[3].id,
        type: CareGapType.IMAGING_REVIEW_OVERDUE,
        status: CareGapStatus.CONTACTED,
        priority: 2,
        dueDate: addDays(today, -5),
        reason: 'Routine baseline OCT not yet signed.',
        suggestedAction: 'Provider review.',
        assignedRole: Role.OPTOMETRIST,
        lastContactedAt: addDays(today, -1),
      },
    ],
  });

  // ----- Message threads -----
  const t1 = await db.messageThread.create({
    data: {
      organizationId,
      patientId: patients[2].id,
      subject: 'Dry eye treatment options',
      category: 'clinical',
    },
  });
  await db.message.create({
    data: {
      threadId: t1.id,
      senderId: null,
      senderRoleAtSend: Role.PATIENT,
      channel: MessageChannel.PORTAL,
      direction: MessageDirection.INBOUND,
      readStatus: MessageReadStatus.UNREAD,
      body: 'My eyes are still burning at the end of the day. The cyclosporine has not helped, what else can we try?',
      createdAt: addDays(today, -2),
    },
  });

  const t2 = await db.messageThread.create({
    data: {
      organizationId,
      patientId: patients[0].id,
      subject: 'Glaucoma follow-up reminder',
      category: 'scheduling',
    },
  });
  await db.message.createMany({
    data: [
      {
        threadId: t2.id,
        senderId: fdUser.id,
        senderRoleAtSend: Role.FRONT_DESK,
        channel: MessageChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        readStatus: MessageReadStatus.READ,
        body: 'Hi Michael, your glaucoma follow-up is today at 9:00 AM. Please reply YES to confirm.',
        createdAt: addDays(today, -1),
      },
      {
        threadId: t2.id,
        senderId: null,
        senderRoleAtSend: Role.PATIENT,
        channel: MessageChannel.SMS,
        direction: MessageDirection.INBOUND,
        readStatus: MessageReadStatus.READ,
        body: 'YES, see you at 9.',
        createdAt: addDays(today, -1),
      },
    ],
  });

  const t3 = await db.messageThread.create({
    data: {
      organizationId,
      patientId: patients[8].id,
      subject: 'CL refit follow-up',
      category: 'clinical',
    },
  });
  await db.message.create({
    data: {
      threadId: t3.id,
      senderId: null,
      senderRoleAtSend: Role.PATIENT,
      channel: MessageChannel.PORTAL,
      direction: MessageDirection.INBOUND,
      readStatus: MessageReadStatus.UNREAD,
      body: 'The new daily lenses feel much better, when do you want me back for the renewal exam?',
      createdAt: addDays(today, -3),
    },
  });

  // ----- Inventory -----
  const invFrames = await db.inventoryItem.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      category: InventoryCategory.FRAMES,
      name: 'Ray-Ban RB5228',
      brand: 'Ray-Ban',
      sku: 'DEMO-RB5228',
      vendor: 'Luxottica',
      costCents: 8900,
      retailCents: 24900,
      quantityOnHand: 4,
      reorderAt: 2,
      reorderQuantity: 6,
      status: InventoryStatus.ACTIVE,
    },
  });
  const invTrials = await db.inventoryItem.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      category: InventoryCategory.CL_TRIALS,
      name: 'Acuvue Oasys 1-Day trial',
      brand: 'Johnson & Johnson',
      sku: 'DEMO-OASYS-1D',
      quantityOnHand: 1,
      reorderAt: 5,
      reorderQuantity: 20,
      status: InventoryStatus.LOW_STOCK,
    },
  });
  await db.inventoryItem.createMany({
    data: [
      {
        organizationId,
        locationId: mainLoc.id,
        category: InventoryCategory.DRY_EYE_PRODUCTS,
        name: 'Preservative-free tears 30ct',
        sku: 'DEMO-PF-TEARS',
        quantityOnHand: 18,
        reorderAt: 10,
        retailCents: 1899,
        costCents: 950,
        status: InventoryStatus.ACTIVE,
      },
      {
        organizationId,
        locationId: southLoc.id,
        category: InventoryCategory.CONTACT_LENSES,
        name: 'Biofinity toric 6pk',
        sku: 'DEMO-BIO-TOR',
        quantityOnHand: 8,
        reorderAt: 4,
        retailCents: 7999,
        costCents: 4200,
        status: InventoryStatus.ACTIVE,
      },
    ],
  });
  await db.inventoryActivity.createMany({
    data: [
      {
        organizationId,
        itemId: invFrames.id,
        type: InventoryActivityType.SOLD,
        quantityDelta: -1,
        reason: 'Demo sale — Sofia Garcia',
        performedById: fdUser.id,
        createdAt: addDays(today, -2),
      },
      {
        organizationId,
        itemId: invTrials.id,
        type: InventoryActivityType.ADJUSTED,
        quantityDelta: -2,
        reason: 'Trial sets dispensed',
        performedById: techUser.id,
        createdAt: addDays(today, -5),
      },
    ],
  });

  // ----- Billing -----
  const michaelInvoice = await db.patientInvoice.create({
    data: {
      organizationId,
      patientId: patients[0].id,
      description: 'Glaucoma follow-up — medical office visit',
      totalCents: 18500,
      paidCents: 0,
      status: InvoiceStatus.OPEN,
      dueDate: addDays(today, -14),
      issuedAt: addDays(today, -30),
    },
  });
  await db.patientInvoice.createMany({
    data: [
      {
        organizationId,
        patientId: patients[4].id,
        description: 'Contact lens fitting + materials',
        totalCents: 32000,
        paidCents: 32000,
        status: InvoiceStatus.PAID,
        dueDate: addDays(today, -10),
        issuedAt: addDays(today, -12),
      },
      {
        organizationId,
        patientId: patients[2].id,
        description: 'Dry eye treatment package',
        totalCents: 8900,
        paidCents: 0,
        status: InvoiceStatus.OPEN,
        dueDate: addDays(today, 14),
      },
    ],
  });
  await db.claim.create({
    data: {
      organizationId,
      patientId: patients[0].id,
      invoiceId: michaelInvoice.id,
      status: ClaimStatus.SUBMITTED,
      payerName: 'Medicare',
      memberId: 'DEMO-MCR-001',
      totalCents: 18500,
      submittedAt: addDays(today, -7),
      lines: {
        create: [
          {
            cptCode: '92012',
            description: 'Ophthalmological follow-up',
            chargeCents: 14500,
            units: 1,
          },
          {
            cptCode: '92133',
            modifier: 'RT',
            description: 'OCT optic nerve',
            chargeCents: 4000,
            units: 1,
          },
        ],
      },
    },
  });

  // ----- Optical orders & lab -----
  const opticalUser = await db.user.findUnique({
    where: { email: 'optical.demo@eyeq.local' },
  });
  const billingUser = await db.user.findUnique({
    where: { email: 'billing.demo@eyeq.local' },
  });
  const opticalById = opticalUser?.id ?? ownerId;

  const lab = await db.opticalLab.create({
    data: {
      organizationId,
      name: 'VisionCraft Lab',
      accountNumber: 'DEMO-VC-1042',
      turnaroundDays: 7,
      shippingMethod: 'Ground',
      phone: '555-200-3000',
    },
  });

  // Daniel Kim (idx 3) — optical order at the lab with an outstanding balance.
  await db.opticalOrder.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      patientId: patients[3].id,
      type: 'SPECTACLES',
      status: 'AT_LAB',
      labId: lab.id,
      labOrderNumber: 'VC-100455',
      warrantyMonths: 12,
      subtotalCents: 42000,
      insuranceAllowanceCents: 15000,
      patientRespCents: 27000,
      depositCents: 10000,
      balanceCents: 17000,
      notes: 'Progressive lenses with anti-reflective coating.',
      createdById: opticalById,
      orderedAt: addDays(today, -3),
      items: {
        create: [
          { kind: 'FRAME', description: 'Ray-Ban RB5228 — Black', quantity: 1, unitPriceCents: 24900, inventoryItemId: invFrames.id },
          { kind: 'LENS', description: 'Progressive 1.67 with AR coating', quantity: 1, unitPriceCents: 17100 },
        ],
      },
      statusEvents: {
        create: [
          { status: 'QUOTE', note: 'Quote created', performedById: opticalById, createdAt: addDays(today, -4) },
          { status: 'ORDERED', note: 'Deposit collected', performedById: opticalById, createdAt: addDays(today, -3) },
          { status: 'AT_LAB', note: 'Sent to VisionCraft Lab', performedById: opticalById, createdAt: addDays(today, -3) },
        ],
      },
    },
  });

  // Sofia Garcia (idx 4) — contact lens order ready for pickup.
  await db.opticalOrder.create({
    data: {
      organizationId,
      locationId: southLoc.id,
      patientId: patients[4].id,
      type: 'CONTACT_LENS',
      status: 'READY_FOR_PICKUP',
      subtotalCents: 26000,
      insuranceAllowanceCents: 12000,
      patientRespCents: 14000,
      depositCents: 14000,
      balanceCents: 0,
      notes: 'Annual supply, daily disposables.',
      createdById: opticalById,
      orderedAt: addDays(today, -6),
      receivedAt: addDays(today, -1),
      items: {
        create: [
          { kind: 'CONTACT_LENS', description: 'Dailies Total 1 — 90 pk x2', quantity: 2, unitPriceCents: 13000 },
        ],
      },
      statusEvents: {
        create: [
          { status: 'ORDERED', performedById: opticalById, createdAt: addDays(today, -6) },
          { status: 'RECEIVED', performedById: opticalById, createdAt: addDays(today, -1) },
          { status: 'READY_FOR_PICKUP', note: 'Patient notified', performedById: opticalById, createdAt: addDays(today, -1) },
        ],
      },
    },
  });

  // Michael Thompson (idx 0) — fresh spectacle quote from today's visit.
  await db.opticalOrder.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      patientId: patients[0].id,
      type: 'SPECTACLES',
      status: 'QUOTE',
      subtotalCents: 38000,
      insuranceAllowanceCents: 15000,
      patientRespCents: 23000,
      balanceCents: 23000,
      notes: 'Quote pending patient decision.',
      createdById: opticalById,
      items: {
        create: [
          { kind: 'FRAME', description: 'Modo 4501 — Tortoise', quantity: 1, unitPriceCents: 19000 },
          { kind: 'LENS', description: 'Single vision 1.6 with AR coating', quantity: 1, unitPriceCents: 19000 },
        ],
      },
      statusEvents: {
        create: [{ status: 'QUOTE', performedById: opticalById }],
      },
    },
  });

  // Rina Desai (idx 7) — spectacles dispensed today (counts toward today's sales).
  await db.opticalOrder.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      patientId: patients[7].id,
      type: 'SPECTACLES',
      status: 'DISPENSED',
      subtotalCents: 31000,
      insuranceAllowanceCents: 15000,
      patientRespCents: 16000,
      depositCents: 16000,
      balanceCents: 0,
      createdById: opticalById,
      orderedAt: addDays(today, -12),
      receivedAt: addDays(today, -2),
      dispensedAt: atHour(today, 10, 30),
      items: {
        create: [
          { kind: 'FRAME', description: 'Kate Spade Amelia — Rose', quantity: 1, unitPriceCents: 16000 },
          { kind: 'LENS', description: 'Single vision 1.5 with AR coating', quantity: 1, unitPriceCents: 15000 },
        ],
      },
      statusEvents: {
        create: [
          { status: 'READY_FOR_PICKUP', performedById: opticalById, createdAt: addDays(today, -2) },
          { status: 'DISPENSED', note: 'Picked up and adjusted', performedById: opticalById, createdAt: atHour(today, 10, 30) },
        ],
      },
    },
  });

  // ----- Patient forms (intake) -----
  await db.patientForm.createMany({
    data: [
      {
        organizationId,
        patientId: patients[8].id, // Maria Lopez — missing intake
        title: 'New patient intake',
        description: 'Demographics, medical history, and consent for treatment.',
        formType: 'intake',
        status: 'PENDING',
      },
      {
        organizationId,
        patientId: patients[8].id,
        title: 'HIPAA acknowledgement',
        description: 'Notice of privacy practices acknowledgement.',
        formType: 'consent',
        status: 'PENDING',
      },
      {
        organizationId,
        patientId: patients[0].id, // Michael Thompson — glaucoma history update
        title: 'Glaucoma history update',
        description: 'Medication adherence and symptom questionnaire.',
        formType: 'intake',
        status: 'COMPLETED',
        completedAt: addDays(today, -1),
      },
    ],
  });

  // ----- Daniel Kim outstanding balance (billing story) -----
  await db.patientInvoice.create({
    data: {
      organizationId,
      patientId: patients[3].id,
      description: 'Comprehensive exam + optical deposit balance',
      totalCents: 27000,
      paidCents: 10000,
      status: InvoiceStatus.OPEN,
      dueDate: addDays(today, 10),
      issuedAt: addDays(today, -3),
    },
  });

  // ----- Staff tasks -----
  await db.staffTask.createMany({
    data: [
      {
        organizationId,
        patientId: patients[0].id,
        assignedToId: odUser.id,
        createdById: ownerId,
        title: 'Review and sign latest OCT for Michael Thompson',
        description: 'AI review complete; provider sign-off needed before today\'s visit.',
        status: 'OPEN',
        priority: 'HIGH',
        dueAt: atHour(today, 12),
      },
      {
        organizationId,
        patientId: patients[8].id,
        assignedToId: fdUser.id,
        createdById: ownerId,
        title: 'Collect intake forms from Maria Lopez',
        description: 'Two forms still pending before her next visit.',
        status: 'OPEN',
        priority: 'NORMAL',
        dueAt: addDays(today, 2),
      },
      {
        organizationId,
        patientId: patients[3].id,
        assignedToId: billingUser?.id ?? ownerId,
        createdById: ownerId,
        title: 'Follow up on Daniel Kim balance',
        description: 'Outstanding balance of $170 after optical deposit.',
        status: 'OPEN',
        priority: 'NORMAL',
        dueAt: addDays(today, 5),
      },
      {
        organizationId,
        patientId: patients[4].id,
        assignedToId: opticalById,
        createdById: ownerId,
        title: 'Notify Sofia Garcia — contacts ready for pickup',
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
      },
      {
        organizationId,
        assignedToId: techUser.id,
        createdById: ownerId,
        title: 'Calibrate autorefractor at Downtown clinic',
        status: 'OPEN',
        priority: 'LOW',
        dueAt: addDays(today, 3),
      },
    ],
  });

  // ----- Recalls / reminders -----
  const recallTemplate = await db.reminderTemplate.create({
    data: {
      organizationId,
      type: ReminderType.DIABETIC_EXAM_REMINDER,
      channel: ReminderChannel.SMS,
      locale: SupportedLocale.EN,
      name: 'Diabetic exam recall',
      body: 'Hi {{firstName}}, your annual diabetic eye exam is due at {{practiceName}}. Reply YES to book or call {{phone}}.',
      variables: ['firstName', 'practiceName', 'phone'],
      isActive: true,
    },
  });
  const recallCampaign = await db.reminderCampaign.create({
    data: {
      organizationId,
      templateId: recallTemplate.id,
      name: 'Q2 diabetic recall (demo)',
      type: ReminderType.DIABETIC_EXAM_REMINDER,
      channel: ReminderChannel.SMS,
      status: ReminderCampaignStatus.COMPLETED,
      scheduledFor: addDays(today, -3),
      approvedById: ownerId,
      approvedAt: addDays(today, -4),
      notes: 'Sample campaign for pitch — deliveries are illustrative.',
    },
  });
  await db.messageDeliveryLog.createMany({
    data: [
      {
        organizationId,
        campaignId: recallCampaign.id,
        patientId: patients[11].id,
        channel: ReminderChannel.SMS,
        status: DeliveryStatus.DELIVERED,
        vendor: 'twilio-mock',
        sentAt: addDays(today, -3),
        deliveredAt: addDays(today, -3),
      },
      {
        organizationId,
        campaignId: recallCampaign.id,
        patientId: patients[7].id,
        channel: ReminderChannel.SMS,
        status: DeliveryStatus.SENT,
        vendor: 'twilio-mock',
        sentAt: addDays(today, -3),
      },
      {
        organizationId,
        campaignId: recallCampaign.id,
        patientId: patients[1].id,
        channel: ReminderChannel.SMS,
        status: DeliveryStatus.DELIVERED,
        vendor: 'twilio-mock',
        sentAt: addDays(today, -1),
        deliveredAt: addDays(today, -1),
      },
    ],
  });
  await db.communicationPreference.createMany({
    data: [
      {
        organizationId,
        patientId: patients[0].id,
        smsOptIn: true,
        emailOptIn: true,
        preferredChannel: ReminderChannel.SMS,
      },
      {
        organizationId,
        patientId: patients[1].id,
        smsOptIn: true,
        emailOptIn: true,
        preferredChannel: ReminderChannel.SMS,
      },
      {
        organizationId,
        patientId: patients[2].id,
        portalOptIn: true,
        preferredChannel: ReminderChannel.PORTAL,
      },
    ],
  });

  // ----- Ambient scribe -----
  const priyaTodayAppt = createdAppointments.find(
    (a) => a.patientIdx === 2 && a.status === AppointmentStatus.SCHEDULED,
  );
  await db.ambientScribeSession.create({
    data: {
      organizationId,
      patientId: patients[2].id,
      appointmentId: priyaTodayAppt?.id,
      providerId: odUser.id,
      status: ScribeSessionStatus.READY,
      consentRecorded: true,
      consentBy: 'patient verbal',
      startedAt: addDays(today, -45),
      stoppedAt: addDays(today, -45),
      durationSeconds: 420,
      chiefComplaint: 'Dry eye burning, worse with screens',
      hpi: 'Patient reports burning and grittiness OU, worse end of day and with computer use. Failed cyclosporine trial.',
      examSummary: 'Mild MGD, tear break-up time shortened OU.',
      assessmentText: 'Evaporative dry eye, moderate, symptomatic despite prior therapy.',
      planText: 'Discuss punctal plugs vs in-office expression. Continue PF tears.',
      generatedSoap:
        'S: Burning OU, worse PM/screens. Prior cyclosporine without relief.\nO: TBUT reduced, mild MGD.\nA: Moderate evaporative dry eye.\nP: Escalation options discussed.',
      reviewStatus: ScribeReviewStatus.READY_FOR_REVIEW,
      aiConfidenceScore: 0.82,
      segments: {
        create: [
          {
            speaker: ScribeSpeaker.PATIENT,
            startMs: 0,
            endMs: 12000,
            text: 'My eyes still burn at the end of the day, especially when I am on the computer.',
            confidence: 0.94,
          },
          {
            speaker: ScribeSpeaker.PROVIDER,
            startMs: 13000,
            endMs: 28000,
            text: 'Let us review what you have tried and talk about next steps like expression or plugs.',
            confidence: 0.91,
          },
        ],
      },
    },
  });
  await db.ambientScribeSession.create({
    data: {
      organizationId,
      patientId: patients[0].id,
      providerId: ownerId,
      status: ScribeSessionStatus.READY,
      consentRecorded: true,
      consentBy: 'patient verbal',
      startedAt: addDays(today, -180),
      stoppedAt: addDays(today, -180),
      durationSeconds: 360,
      chiefComplaint: 'Glaucoma follow-up',
      assessmentText: 'POAG stable on current therapy.',
      planText: 'Continue latanoprost. RTC 3 months.',
      reviewStatus: ScribeReviewStatus.APPROVED,
      reviewedById: ownerId,
      reviewedAt: addDays(today, -180),
      aiConfidenceScore: 0.88,
    },
  });

  // ----- EHR integration (sandbox showcase) -----
  const ehr = await db.ehrIntegration.create({
    data: {
      organizationId,
      vendor: ConnectedEhrVendor.REVOLUTION_EHR,
      displayName: 'RevolutionEHR (sandbox)',
      connectorMethod: EhrConnectorMethod.API_NATIVE,
      status: EhrConnectionStatus.SANDBOX_CONNECTED,
      syncDirection: EhrSyncDirection.BIDIRECTIONAL,
      patientSync: true,
      appointmentSync: true,
      noteExport: true,
      prescriptionSync: false,
      imagingMetadataSync: true,
      baseUrl: 'https://sandbox.revolutionehr.com',
      sandboxOnly: true,
      lastSyncAt: addDays(today, -1),
      setupChecklist: [
        { label: 'Sandbox credentials', done: true, owner: 'IT' },
        { label: 'Patient demographic mapping', done: true, owner: 'Admin' },
        { label: 'Production go-live approval', done: false, owner: 'Owner' },
      ],
      notes: 'Demo connection for pitch conversations — not syncing real PHI.',
    },
  });
  await db.ehrSyncLog.create({
    data: {
      integrationId: ehr.id,
      resourceType: 'Patient',
      direction: EhrSyncDirection.INBOUND,
      recordsTotal: 12,
      recordsOk: 12,
      recordsFailed: 0,
      status: 'ok',
      finishedAt: addDays(today, -1),
    },
  });

  // ----- Google Business reviews (reputation) -----
  const gbpConnection = await db.googleBusinessConnection.create({
    data: {
      organizationId,
      locationId: mainLoc.id,
      placeName: `${DEMO_ORG_NAME}, Downtown`,
      googlePlaceId: 'demo-place-downtown',
      demoMode: true,
      lastSyncedAt: today,
    },
  });

  const demoGoogleReviews: Array<{
    externalReviewId: string;
    reviewerName: string;
    starRating: number;
    comment: string;
    reviewedAt: Date;
    replyStatus: GoogleReviewReplyStatus;
    draftReply?: string;
    publishedReply?: string;
    publishedAt?: Date;
    publishedById?: string;
  }> = [
    {
      externalReviewId: 'demo-review-5star-thanks',
      reviewerName: 'Sarah M.',
      starRating: 5,
      comment:
        'Dr. Chen and the team were fantastic. Short wait, thorough exam, and they explained my monitoring plan clearly.',
      reviewedAt: addDays(today, -2),
      replyStatus: GoogleReviewReplyStatus.PENDING_REPLY,
    },
    {
      externalReviewId: 'demo-review-3star-neutral',
      reviewerName: 'Robert L.',
      starRating: 3,
      comment: 'Good doctors but I waited 25 minutes past my appointment time.',
      reviewedAt: addDays(today, -4),
      replyStatus: GoogleReviewReplyStatus.PENDING_REPLY,
    },
    {
      externalReviewId: 'demo-review-1star-escalation',
      reviewerName: 'Angela T.',
      starRating: 1,
      comment: 'Felt rushed at checkout and billing questions were not answered clearly.',
      reviewedAt: addDays(today, -6),
      replyStatus: GoogleReviewReplyStatus.PENDING_REPLY,
    },
    {
      externalReviewId: 'demo-review-draft-awaiting',
      reviewerName: 'Priya N.',
      starRating: 4,
      comment: 'Friendly staff and clean office. Parking was a little tight but overall a great visit.',
      reviewedAt: addDays(today, -9),
      replyStatus: GoogleReviewReplyStatus.DRAFT,
      draftReply:
        'Thank you for visiting EyeQ Vision Center, Priya. We are glad the team made you feel welcome. We continue improving parking guidance for downtown visits.',
    },
    {
      externalReviewId: 'demo-review-demo-published',
      reviewerName: 'James K.',
      starRating: 5,
      comment: 'Best eye exam I have had in years. The OCT imaging walkthrough was really helpful.',
      reviewedAt: addDays(today, -12),
      replyStatus: GoogleReviewReplyStatus.DEMO_PUBLISHED,
      draftReply:
        'Thank you, James! We are glad the imaging walkthrough helped. We look forward to seeing you at your next visit.',
      publishedReply:
        'Thank you, James! We are glad the imaging walkthrough helped. We look forward to seeing you at your next visit.',
      publishedAt: addDays(today, -11),
      publishedById: ownerId,
    },
  ];

  for (const row of demoGoogleReviews) {
    await db.googleReview.create({
      data: {
        organizationId,
        connectionId: gbpConnection.id,
        locationId: mainLoc.id,
        externalReviewId: row.externalReviewId,
        reviewerName: row.reviewerName,
        starRating: row.starRating,
        comment: row.comment,
        reviewedAt: row.reviewedAt,
        replyStatus: row.replyStatus,
        draftReply: row.draftReply ?? null,
        publishedReply: row.publishedReply ?? null,
        publishedAt: row.publishedAt ?? null,
        publishedById: row.publishedById ?? null,
      },
    });
  }

  const demoGoogleQuestions = [
    {
      externalQuestionId: 'demo-q-appointments',
      authorName: 'Chris P.',
      questionText: 'Do you have evening appointment availability for comprehensive eye exams?',
      askedAt: addDays(today, -3),
      replyStatus: GoogleQuestionReplyStatus.UNANSWERED,
    },
    {
      externalQuestionId: 'demo-q-insurance',
      authorName: 'Morgan L.',
      questionText: 'Which vision insurance plans do you accept?',
      askedAt: addDays(today, -5),
      replyStatus: GoogleQuestionReplyStatus.UNANSWERED,
    },
    {
      externalQuestionId: 'demo-q-cl-exams',
      authorName: 'Taylor R.',
      questionText: 'Do you offer contact lens exams and fittings for first-time wearers?',
      askedAt: addDays(today, -7),
      replyStatus: GoogleQuestionReplyStatus.UNANSWERED,
    },
    {
      externalQuestionId: 'demo-q-answered',
      authorName: 'Alex W.',
      questionText: 'Is parking available near the downtown office?',
      askedAt: addDays(today, -10),
      replyStatus: GoogleQuestionReplyStatus.DEMO_PUBLISHED,
      publishedReply:
        'Yes. Street parking and a nearby garage are available. Our front desk can share the easiest options when you arrive.',
      publishedAt: addDays(today, -9),
    },
  ] as const;

  for (const row of demoGoogleQuestions) {
    await db.googleBusinessQuestion.create({
      data: {
        organizationId,
        connectionId: gbpConnection.id,
        locationId: mainLoc.id,
        externalQuestionId: row.externalQuestionId,
        authorName: row.authorName,
        questionText: row.questionText,
        askedAt: row.askedAt,
        replyStatus: row.replyStatus,
        publishedReply: 'publishedReply' in row ? row.publishedReply : null,
        publishedAt: 'publishedAt' in row ? row.publishedAt : null,
      },
    });
  }

  // Keep a staff task pointer for the walkthrough checklist.
  await db.staffTask.create({
    data: {
      organizationId,
      assignedToId: ownerId,
      createdById: ownerId,
      title: 'Respond to Google question (demo)',
      description:
        'Open Reputation → Google Questions. Answer appointment / insurance / CL questions. Publishing stays DEMO_PUBLISHED unless Google Business is connected.',
      status: 'OPEN',
      priority: 'NORMAL',
      dueAt: atHour(today, 17),
    },
  });

  // Support ticket for audit / support walkthrough step
  await db.supportTicket.create({
    data: {
      organizationId,
      createdById: ownerId,
      assignedToId: ownerId,
      category: SupportTicketCategory.OTHER,
      priority: SupportTicketPriority.NORMAL,
      status: SupportTicketStatus.OPEN,
      subject: 'Demo: billing export clarification',
      description:
        'Synthetic support ticket for the Live Demo. No real patient PHI. Used to show internal support tracking.',
      mayContainPhi: false,
    },
  });

  // Eye Health Library — practice approval overlays + patient recommendations (demo)
  const demoEducationSlugs = [
    'dry-eye',
    'glaucoma-overview',
    'diabetic-eye-exam',
    'contact-lens-care',
    'floaters-and-flashes',
  ] as const;
  for (const slug of demoEducationSlugs) {
    await db.eyeHealthOrgArticleState.create({
      data: {
        organizationId,
        slug,
        reviewStatus: EyeHealthOrgReviewStatus.PRACTICE_APPROVED,
        lastReviewedAt: today,
        reviewedById: ownerId,
      },
    });
  }
  await db.eyeHealthRecommendation.createMany({
    data: [
      {
        organizationId,
        patientId: patients[0].id,
        slug: 'glaucoma-overview',
        recommendedById: odUser.id,
        context: EyeHealthRecommendationContext.RELATED_TO_VISIT,
        note: 'Your provider shared this article because it may relate to your visit.',
      },
      {
        organizationId,
        patientId: patients[0].id,
        slug: 'eye-pressure-and-oct-rnfl',
        recommendedById: odUser.id,
        context: EyeHealthRecommendationContext.PROVIDER_RECOMMENDED,
        note: 'Your provider shared this article because it may relate to your visit.',
      },
      {
        organizationId,
        patientId: patients[1].id,
        slug: 'diabetic-eye-exam',
        recommendedById: ownerId,
        context: EyeHealthRecommendationContext.RELATED_TO_VISIT,
        note: 'Your provider shared this article because it may relate to your visit.',
      },
    ],
  });
}
