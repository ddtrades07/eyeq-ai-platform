/**
 * EyeQ AI seed script.
 *
 * Creates a fully populated demo organization so the app feels real on
 * the first `npm run dev`. Re-running is safe — the script truncates
 * the demo org's data before re-inserting it.
 *
 * Usage:
 *   npx prisma migrate deploy
 *   npm run db:seed
 */

import {
  AppointmentStatus,
  AppointmentType,
  CareGapStatus,
  CareGapType,
  ConnectedEhrVendor,
  EhrConnectionStatus,
  EhrConnectorMethod,
  EhrSyncDirection,
  ImageType,
  ImagingStatus,
  InventoryActivityType,
  InventoryCategory,
  InventoryStatus,
  MessageChannel,
  MessageDirection,
  PrescriptionType,
  PrismaClient,
  ReminderChannel,
  ReminderType,
  Role,
  ScribeSessionStatus,
  ScribeSpeaker,
  SupportedLocale,
} from '@prisma/client';
import { STARTER_DISEASE_TEMPLATES } from '../src/lib/templates/disease-templates';
import { STARTER_REMINDERS } from '../src/lib/reminders/catalog';

const db = new PrismaClient();

const DEMO_SLUG = 'sunrise-eye-care';

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function atHour(d: Date, h: number, m = 0) {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}
function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

async function clearDemoData(organizationId: string) {
  await db.message.deleteMany({ where: { thread: { organizationId } } });
  await db.messageThread.deleteMany({ where: { organizationId } });
  await db.messageDeliveryLog.deleteMany({ where: { organizationId } });
  await db.reminderCampaign.deleteMany({ where: { organizationId } });
  await db.reminderTemplate.deleteMany({ where: { organizationId } });
  await db.communicationPreference.deleteMany({ where: { organizationId } });
  await db.transcriptSegment.deleteMany({ where: { session: { organizationId } } });
  await db.ambientScribeSession.deleteMany({ where: { organizationId } });
  await db.inventoryActivity.deleteMany({ where: { organizationId } });
  await db.inventoryItem.deleteMany({ where: { organizationId } });
  await db.diseaseTemplate.deleteMany({ where: { organizationId } });
  await db.ehrSyncLog.deleteMany({ where: { integration: { organizationId } } });
  await db.ehrIntegration.deleteMany({ where: { organizationId } });
  await db.financialReport.deleteMany({ where: { organizationId } });
  await db.translationString.deleteMany({ where: { organizationId } });
  await db.careGap.deleteMany({ where: { organizationId } });
  await db.imagingFinding.deleteMany({ where: { imagingAnalysis: { imagingCase: { organizationId } } } });
  await db.imagingAnalysis.deleteMany({ where: { imagingCase: { organizationId } } });
  await db.imageQualityAssessment.deleteMany({ where: { imagingCase: { organizationId } } });
  await db.providerImagingReview.deleteMany({ where: { imagingCase: { organizationId } } });
  await db.imagingAuditEvent.deleteMany({ where: { organizationId } });
  await db.imagingAsset.deleteMany({ where: { imagingCase: { organizationId } } });
  await db.imagingCase.deleteMany({ where: { organizationId } });
  await db.clinicalNote.deleteMany({ where: { organizationId } });
  await db.prescription.deleteMany({ where: { organizationId } });
  await db.appointment.deleteMany({ where: { organizationId } });
  await db.document.deleteMany({ where: { organizationId } });
  await db.patient.deleteMany({ where: { organizationId } });
  await db.provider.deleteMany({ where: { organizationId } });
  await db.userLocationAccess.deleteMany({ where: { location: { organizationId } } });
  await db.location.deleteMany({ where: { organizationId } });
  await db.organizationMembership.deleteMany({ where: { organizationId } });
  await db.user.deleteMany({ where: { organizationId } });
  await db.organization.deleteMany({ where: { id: organizationId } });
}

async function main() {
  console.log('Seeding EyeQ AI demo organization…');

  const existing = await db.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.log(`Found existing org ${existing.id}; resetting demo data…`);
    await clearDemoData(existing.id);
  }

  const org = await db.organization.create({
    data: {
      name: 'Sunrise Eye Care',
      slug: DEMO_SLUG,
      practiceMode: 'NATIVE_EHR',
      connectedEhr: ConnectedEhrVendor.NONE,
      defaultLocale: SupportedLocale.EN,
    },
  });

  const [mainLoc, southLoc] = await Promise.all([
    db.location.create({
      data: {
        organizationId: org.id,
        name: 'Sunrise Eye Care — Main',
        shortName: 'Main',
        addressLine1: '123 Aurora Way',
        city: 'San Diego',
        region: 'CA',
        postalCode: '92101',
        isPrimary: true,
        rooms: 4,
      },
    }),
    db.location.create({
      data: {
        organizationId: org.id,
        name: 'Sunrise Eye Care — South Bay',
        shortName: 'South Bay',
        addressLine1: '900 Coast Blvd',
        city: 'Chula Vista',
        region: 'CA',
        postalCode: '91910',
        rooms: 3,
      },
    }),
  ]);

  // Demo staff — these users will exist only in the EyeQ database. To
  // actually log them in you must also create matching Supabase Auth
  // users (Auth dashboard or `supabase.auth.admin.createUser`) and copy
  // the resulting Supabase UID into the `supabaseUserId` field below.
  const owner = await db.user.create({
    data: {
      supabaseUserId: 'seed-owner-uid',
      email: 'owner@sunriseeyecare.test',
      firstName: 'Avery',
      lastName: 'Lin',
      role: Role.OWNER,
      organizationId: org.id,
      defaultOrganizationId: org.id,
      memberships: { create: { organizationId: org.id, role: Role.OWNER, isPrimary: true } },
    },
  });

  const od = await db.user.create({
    data: {
      supabaseUserId: 'seed-od-uid',
      email: 'od@sunriseeyecare.test',
      firstName: 'Maya',
      lastName: 'Patel',
      role: Role.OPTOMETRIST,
      organizationId: org.id,
      defaultOrganizationId: org.id,
      memberships: { create: { organizationId: org.id, role: Role.OPTOMETRIST, isPrimary: true } },
    },
  });

  const tech = await db.user.create({
    data: {
      supabaseUserId: 'seed-tech-uid',
      email: 'tech@sunriseeyecare.test',
      firstName: 'Jordan',
      lastName: 'Reyes',
      role: Role.TECHNICIAN,
      organizationId: org.id,
      defaultOrganizationId: org.id,
      memberships: { create: { organizationId: org.id, role: Role.TECHNICIAN, isPrimary: true } },
    },
  });

  const fd = await db.user.create({
    data: {
      supabaseUserId: 'seed-fd-uid',
      email: 'frontdesk@sunriseeyecare.test',
      firstName: 'Sam',
      lastName: 'Nguyen',
      role: Role.FRONT_DESK,
      organizationId: org.id,
      defaultOrganizationId: org.id,
      memberships: { create: { organizationId: org.id, role: Role.FRONT_DESK, isPrimary: true } },
    },
  });

  await db.userLocationAccess.createMany({
    data: [
      { userId: tech.id, locationId: mainLoc.id },
      { userId: fd.id, locationId: mainLoc.id },
      { userId: fd.id, locationId: southLoc.id },
    ],
  });

  const ownerProvider = await db.provider.create({
    data: {
      organizationId: org.id,
      userId: owner.id,
      credentials: 'OD, FAAO',
      title: 'Owner / Primary OD',
      locations: { connect: [{ id: mainLoc.id }] },
    },
  });
  const odProvider = await db.provider.create({
    data: {
      organizationId: org.id,
      userId: od.id,
      credentials: 'OD',
      title: 'Associate OD',
      locations: { connect: [{ id: mainLoc.id }, { id: southLoc.id }] },
    },
  });

  const patients = await Promise.all([
    db.patient.create({
      data: {
        organizationId: org.id,
        firstName: 'Riley',
        lastName: 'Singh',
        dateOfBirth: new Date('1988-03-12'),
        email: 'riley.singh@example.com',
        phone: '555-101-1010',
        hasDiabetes: true,
        insuranceCarrier: 'VSP',
        insuranceStatus: 'Verified',
      },
    }),
    db.patient.create({
      data: {
        organizationId: org.id,
        firstName: 'Daniela',
        lastName: 'Romero',
        dateOfBirth: new Date('1962-11-04'),
        email: 'daniela.romero@example.com',
        phone: '555-202-2020',
        hasGlaucomaPersonal: true,
        insuranceCarrier: 'EyeMed',
      },
    }),
    db.patient.create({
      data: {
        organizationId: org.id,
        firstName: 'Kenji',
        lastName: 'Watanabe',
        dateOfBirth: new Date('1975-06-22'),
        email: 'kenji.w@example.com',
        phone: '555-303-3030',
        hasHypertension: true,
      },
    }),
    db.patient.create({
      data: {
        organizationId: org.id,
        firstName: 'Aaliyah',
        lastName: 'Brooks',
        dateOfBirth: new Date('1998-01-09'),
        email: 'aaliyah.brooks@example.com',
        phone: '555-404-4040',
      },
    }),
    db.patient.create({
      data: {
        organizationId: org.id,
        firstName: 'Marcus',
        lastName: 'Hale',
        dateOfBirth: new Date('1955-09-19'),
        email: 'marcus.hale@example.com',
        phone: '555-505-5050',
        hasGlaucomaFamily: true,
        hasHypertension: true,
      },
    }),
  ]);

  const today = atHour(new Date(), 0, 0);

  const apptPlans: Array<{
    patientId: string;
    type: AppointmentType;
    when: Date;
    status: AppointmentStatus;
    providerId: string;
    locationId: string;
  }> = [
    {
      patientId: patients[0].id,
      type: AppointmentType.DIABETIC_EYE_EXAM,
      when: atHour(today, 9),
      status: AppointmentStatus.CONFIRMED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientId: patients[1].id,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(today, 10, 30),
      status: AppointmentStatus.CHECKED_IN,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientId: patients[2].id,
      type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
      when: atHour(today, 13),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: mainLoc.id,
    },
    {
      patientId: patients[3].id,
      type: AppointmentType.CONTACT_LENS_EXAM,
      when: atHour(today, 15),
      status: AppointmentStatus.SCHEDULED,
      providerId: odProvider.id,
      locationId: southLoc.id,
    },
    {
      patientId: patients[4].id,
      type: AppointmentType.GLAUCOMA_FOLLOWUP,
      when: atHour(addDays(today, -14), 11),
      status: AppointmentStatus.COMPLETED,
      providerId: ownerProvider.id,
      locationId: mainLoc.id,
    },
  ];

  for (const plan of apptPlans) {
    await db.appointment.create({
      data: {
        organizationId: org.id,
        locationId: plan.locationId,
        patientId: plan.patientId,
        providerId: plan.providerId,
        type: plan.type,
        status: plan.status,
        startsAt: plan.when,
        endsAt: new Date(plan.when.getTime() + 45 * 60 * 1000),
        durationMinutes: 45,
        complexity: rand(['Low', 'Moderate', 'High']),
        noShowRiskScore: Math.random() * 0.4,
      },
    });
  }

  await db.imagingCase.createMany({
    data: [
      {
        organizationId: org.id,
        patientId: patients[0].id,
        uploaderId: tech.id,
        imageType: ImageType.FUNDUS,
        storagePath: `${org.id}/${patients[0].id}/seed-fundus.jpg`,
        capturedAt: addDays(today, -1),
        status: ImagingStatus.AI_REVIEWED,
        aiQuality: 'good',
        aiAnatomyDetected: ['optic disc', 'macula', 'retinal vasculature'],
        aiFlags: ['retinal microaneurysms — verify'],
        aiUrgency: 'review-soon',
        aiConfidence: 'moderate',
        aiNotes: [
          'Possible non-proliferative findings — clinician should verify.',
          'Consider comparing to prior baseline imaging.',
        ],
        aiInvokedAt: new Date(),
        aiProvider: 'mock',
      },
      {
        organizationId: org.id,
        patientId: patients[1].id,
        uploaderId: tech.id,
        imageType: ImageType.OCT,
        storagePath: `${org.id}/${patients[1].id}/seed-oct.png`,
        capturedAt: addDays(today, -3),
        status: ImagingStatus.AWAITING_AI,
      },
      {
        organizationId: org.id,
        patientId: patients[4].id,
        uploaderId: tech.id,
        imageType: ImageType.VISUAL_FIELD,
        storagePath: `${org.id}/${patients[4].id}/seed-vf.png`,
        capturedAt: addDays(today, -10),
        status: ImagingStatus.PROVIDER_SIGNED,
        providerNote: 'Stable compared to baseline.',
        signedById: owner.id,
        signedAt: new Date(),
        trend: 'stable',
      },
    ],
  });

  await db.prescription.createMany({
    data: [
      {
        organizationId: org.id,
        patientId: patients[0].id,
        type: PrescriptionType.GLASSES,
        issuedAt: addDays(today, -180),
        expiresAt: addDays(today, 185),
        providerName: 'Dr. Avery Lin, OD',
        odSphere: '-2.25', odCyl: '-0.50', odAxis: '180', odAdd: '+1.00',
        osSphere: '-2.50', osCyl: '-0.75', osAxis: '175', osAdd: '+1.00',
        pd: '63',
      },
      {
        organizationId: org.id,
        patientId: patients[3].id,
        type: PrescriptionType.CONTACTS,
        issuedAt: addDays(today, -200),
        expiresAt: addDays(today, 165),
        providerName: 'Dr. Maya Patel, OD',
        modality: 'Daily',
        odBrand: 'Acuvue Oasys 1-Day',
        odBc: '8.5', odDia: '14.3', odPower: '-3.00',
        osBrand: 'Acuvue Oasys 1-Day',
        osBc: '8.5', osDia: '14.3', osPower: '-3.25',
      },
    ],
  });

  await db.careGap.createMany({
    data: [
      {
        organizationId: org.id,
        patientId: patients[2].id,
        type: CareGapType.ANNUAL_EXAM_OVERDUE,
        status: CareGapStatus.OVERDUE,
        priority: 1,
        dueDate: addDays(today, -30),
        reason: 'Last comprehensive exam > 13 months ago.',
        suggestedAction: 'SMS outreach to schedule comprehensive exam.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId: org.id,
        patientId: patients[0].id,
        type: CareGapType.DIABETIC_FOLLOWUP_OVERDUE,
        status: CareGapStatus.DUE,
        priority: 0,
        dueDate: addDays(today, 7),
        reason: 'Diabetic eye exam due within 30 days.',
        suggestedAction: 'Schedule diabetic eye exam.',
        assignedRole: Role.FRONT_DESK,
      },
      {
        organizationId: org.id,
        patientId: patients[1].id,
        type: CareGapType.GLAUCOMA_FOLLOWUP_OVERDUE,
        status: CareGapStatus.CONTACTED,
        priority: 0,
        dueDate: addDays(today, -7),
        reason: 'Glaucoma follow-up overdue per provider plan.',
        suggestedAction: 'Confirm scheduled follow-up next month.',
        assignedRole: Role.FRONT_DESK,
        lastContactedAt: addDays(today, -2),
      },
    ],
  });

  const thread = await db.messageThread.create({
    data: {
      organizationId: org.id,
      patientId: patients[0].id,
      subject: 'Diabetic eye exam scheduling',
      category: 'scheduling',
      messages: {
        create: [
          {
            senderId: fd.id,
            senderRoleAtSend: Role.FRONT_DESK,
            channel: MessageChannel.PORTAL,
            direction: MessageDirection.OUTBOUND,
            body:
              'Hi Riley — it’s time for your annual diabetic eye exam. Would Friday at 9:00 AM work?',
          },
        ],
      },
    },
  });
  await db.message.create({
    data: {
      threadId: thread.id,
      senderId: null,
      senderRoleAtSend: Role.PATIENT,
      channel: MessageChannel.PORTAL,
      direction: MessageDirection.INBOUND,
      body: 'Friday 9 AM works — thanks!',
    },
  });

  await db.ehrIntegration.createMany({
    data: [
      {
        organizationId: org.id,
        vendor: ConnectedEhrVendor.EPIC,
        displayName: 'Epic',
        connectorMethod: EhrConnectorMethod.SMART_ON_FHIR,
        status: EhrConnectionStatus.SANDBOX_CONNECTED,
        syncDirection: EhrSyncDirection.BIDIRECTIONAL,
        patientSync: true,
        appointmentSync: true,
        noteExport: true,
        prescriptionSync: true,
        imagingMetadataSync: true,
        sandboxOnly: true,
        baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
        scopes: ['launch/patient', 'patient.read', 'appointment.read'],
        setupChecklist: [
          { label: 'Submit Epic on FHIR application', done: true },
          { label: 'Receive client ID + scopes from health system', done: true },
          { label: 'Configure OAuth redirect URI in EyeQ vault', done: false },
          { label: 'Validate against Epic sandbox', done: false },
          { label: 'Sign BAA + production go-live with health system', done: false },
        ],
        lastSyncAt: addDays(today, -1),
      },
      {
        organizationId: org.id,
        vendor: ConnectedEhrVendor.REVOLUTION_EHR,
        displayName: 'RevolutionEHR',
        connectorMethod: EhrConnectorMethod.API_NATIVE,
        status: EhrConnectionStatus.NOT_CONNECTED,
        syncDirection: EhrSyncDirection.NONE,
        patientSync: true,
        appointmentSync: true,
        noteExport: true,
        prescriptionSync: true,
        imagingMetadataSync: false,
        sandboxOnly: true,
        setupChecklist: [
          { label: 'Request RevolutionEHR API credentials', done: false },
          { label: 'Map practice + provider IDs', done: false },
        ],
      },
    ],
  });

  const inventoryItems = [
    { category: InventoryCategory.FRAMES, name: 'Aurora Round Acetate', brand: 'EyeQ House', sku: 'FRM-001', vendor: 'EyeQ House', cost: 4200, retail: 18000, qty: 22, reorderAt: 8, reorderQty: 12 },
    { category: InventoryCategory.FRAMES, name: 'Solstice Titanium', brand: 'EyeQ House', sku: 'FRM-002', vendor: 'EyeQ House', cost: 6800, retail: 28000, qty: 6, reorderAt: 6, reorderQty: 10 },
    { category: InventoryCategory.LENSES, name: 'Polycarbonate AR Lens', brand: 'OptiLens', sku: 'LNS-PC-001', vendor: 'OptiLens', cost: 1800, retail: 12000, qty: 60, reorderAt: 20, reorderQty: 40 },
    { category: InventoryCategory.CONTACT_LENSES, name: 'Acuvue Oasys 1-Day 90pk', brand: 'J&J', sku: 'CL-AO1D-90', vendor: 'J&J', cost: 5400, retail: 8800, qty: 25, reorderAt: 10, reorderQty: 30 },
    { category: InventoryCategory.CL_TRIALS, name: 'CL trial — 8.4 / -2.00', brand: 'B&L', sku: 'CL-TR-001', vendor: 'B&L', cost: 0, retail: 0, qty: 3, reorderAt: 5, reorderQty: 20 },
    { category: InventoryCategory.DROPS_AND_OTC, name: 'Preservative-free artificial tears', brand: 'Refresh', sku: 'OTC-AT-PF', vendor: 'Allergan', cost: 600, retail: 1800, qty: 40, reorderAt: 15, reorderQty: 30 },
    { category: InventoryCategory.DRY_EYE_PRODUCTS, name: 'Warm compress mask', brand: 'Bruder', sku: 'DRY-WC-001', vendor: 'Bruder', cost: 900, retail: 2600, qty: 12, reorderAt: 6, reorderQty: 10 },
    { category: InventoryCategory.DIAGNOSTIC_SUPPLIES, name: 'Fluorescein strips (100ct)', brand: 'Generic', sku: 'DX-FL-100', vendor: 'Generic', cost: 1200, retail: 0, qty: 8, reorderAt: 4, reorderQty: 6 },
  ];

  for (const item of inventoryItems) {
    const status: InventoryStatus =
      item.qty <= 0 ? InventoryStatus.OUT_OF_STOCK
      : item.qty <= item.reorderAt ? InventoryStatus.LOW_STOCK
      : InventoryStatus.ACTIVE;
    const created = await db.inventoryItem.create({
      data: {
        organizationId: org.id,
        category: item.category,
        name: item.name,
        brand: item.brand,
        sku: item.sku,
        vendor: item.vendor,
        costCents: item.cost,
        retailCents: item.retail,
        quantityOnHand: item.qty,
        reorderAt: item.reorderAt,
        reorderQuantity: item.reorderQty,
        status,
      },
    });
    if (item.qty > 0) {
      await db.inventoryActivity.create({
        data: {
          organizationId: org.id,
          itemId: created.id,
          type: InventoryActivityType.RECEIVED,
          quantityDelta: item.qty,
          reason: 'Initial stocking (seed)',
          performedById: owner.id,
        },
      });
    }
  }

  for (const t of STARTER_DISEASE_TEMPLATES.slice(0, 8)) {
    await db.diseaseTemplate.create({
      data: {
        organizationId: org.id,
        slug: t.slug,
        name: t.name,
        category: t.category,
        hpiPrompts: t.hpiPrompts,
        examElements: t.examElements,
        assessmentOptions: t.assessmentOptions,
        planOptions: t.planOptions,
        educationPoints: t.educationPoints,
        codingSuggestions: t.codingSuggestions,
        referralCriteria: t.referralCriteria,
        followUpOptions: t.followUpOptions,
        isSystem: true,
      },
    });
  }

  for (const r of STARTER_REMINDERS) {
    await db.reminderTemplate.create({
      data: {
        organizationId: org.id,
        type: r.type,
        channel: r.channel,
        locale: r.locale,
        name: r.name,
        subject: r.subject ?? null,
        body: r.body,
        variables: r.variables,
      },
    });
  }

  const annualTemplate = await db.reminderTemplate.findFirst({
    where: { organizationId: org.id, type: ReminderType.ANNUAL_EXAM_REMINDER, channel: ReminderChannel.SMS },
  });
  await db.reminderCampaign.create({
    data: {
      organizationId: org.id,
      name: 'Q3 annual exam recall · SMS',
      type: ReminderType.ANNUAL_EXAM_REMINDER,
      channel: ReminderChannel.SMS,
      templateId: annualTemplate?.id ?? null,
      scheduledFor: addDays(today, 7),
      status: 'DRAFT',
      notes: 'Audience: patients without a visit in 13+ months.',
    },
  });

  for (const p of patients) {
    await db.communicationPreference.create({
      data: {
        organizationId: org.id,
        patientId: p.id,
        smsOptIn: Math.random() > 0.3,
        emailOptIn: true,
        portalOptIn: true,
        callOptIn: true,
        preferredChannel: ReminderChannel.PORTAL,
      },
    });
  }

  const scribeSession = await db.ambientScribeSession.create({
    data: {
      organizationId: org.id,
      providerId: owner.id,
      patientId: patients[0].id,
      status: ScribeSessionStatus.READY,
      consentRecorded: true,
      consentBy: 'verbal',
      startedAt: addDays(today, -1),
      stoppedAt: new Date(addDays(today, -1).getTime() + 18 * 60_000),
      durationSeconds: 18 * 60,
      generatedSoap:
        'Subjective: Patient reports burning eyes worse on screens.\nObjective: BCVA 20/20 OU, IOP 14/15. Mild MGD, no staining.\nAssessment: Provider to confirm.\nPlan: Lid hygiene + PF tears + follow-up 6 weeks.',
      generatedPlan: 'Use preservative-free tears 4x/day, warm compress nightly, follow-up in 6 weeks.',
      generatedCoding: ['H04.123 (illustrative)'],
    },
  });
  await db.transcriptSegment.createMany({
    data: [
      { sessionId: scribeSession.id, speaker: ScribeSpeaker.PROVIDER, startMs: 0, endMs: 4000, text: 'Hi, what brings you in today?' },
      { sessionId: scribeSession.id, speaker: ScribeSpeaker.PATIENT, startMs: 4000, endMs: 12000, text: 'My eyes have been burning and feel tired by the end of the day.' },
      { sessionId: scribeSession.id, speaker: ScribeSpeaker.PROVIDER, startMs: 12000, endMs: 20000, text: 'How long, and is it both eyes? Are you using any drops?' },
      { sessionId: scribeSession.id, speaker: ScribeSpeaker.PATIENT, startMs: 20000, endMs: 28000, text: 'Both eyes, about two months. I tried generic artificial tears a few times a day.' },
      { sessionId: scribeSession.id, speaker: ScribeSpeaker.TECHNICIAN, startMs: 28000, endMs: 36000, text: 'Vision today 20/20 each eye, IOP 14 and 15.' },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo practice slug:', DEMO_SLUG);
  console.log('Demo accounts (link to Supabase Auth to use):');
  console.log('  owner@sunriseeyecare.test — OWNER');
  console.log('  od@sunriseeyecare.test    — OPTOMETRIST');
  console.log('  tech@sunriseeyecare.test  — TECHNICIAN');
  console.log('  frontdesk@sunriseeyecare.test — FRONT_DESK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
