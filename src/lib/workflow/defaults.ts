import { AppointmentType } from '@prisma/client';

export type VisitWorkflowTemplateData = {
  type: AppointmentType;
  name: string;
  durationMinutes: number;
  pretest: string[];
  imaging: string[];
  carePathway: string[];
};

export const DEFAULT_WORKFLOW_TEMPLATES: VisitWorkflowTemplateData[] = [
  {
    type: AppointmentType.COMPREHENSIVE_EYE_EXAM,
    name: 'Comprehensive Eye Exam',
    durationMinutes: 45,
    pretest: [
      'Distance VA cc OD/OS',
      'Near VA cc OD/OS',
      'IOP both eyes',
      'Auto-refraction',
      'Pupil exam',
      'Confrontation visual fields',
      'Color vision (if first visit)',
    ],
    imaging: ['Fundus photo if 18+ or risk factors'],
    carePathway: [
      'Pretest by technician',
      'Refraction + slit lamp by OD',
      'Dilated fundus exam',
      'Plan + Rx delivered to patient',
    ],
  },
  {
    type: AppointmentType.CONTACT_LENS_EXAM,
    name: 'Contact Lens Exam',
    durationMinutes: 45,
    pretest: [
      'VA cc with current lenses OD/OS',
      'Lens condition and wear schedule',
      'IOP both eyes',
      'Slit lamp signs documented',
    ],
    imaging: ['Corneal topography if irregular'],
    carePathway: [
      'Document current lens prescription',
      'Slit lamp evaluation',
      'Trial lens selection / fit',
      'Insertion + removal coaching',
    ],
  },
  {
    type: AppointmentType.GLAUCOMA_FOLLOWUP,
    name: 'Glaucoma Follow-Up',
    durationMinutes: 30,
    pretest: [
      'Drop adherence review',
      'IOP both eyes (record drop time)',
      'Distance VA cc',
    ],
    imaging: ['OCT RNFL within last 12 months', 'Visual field within last 12 months'],
    carePathway: [
      'Drop adherence interview',
      'IOP + slit lamp',
      'Disc imaging review',
      'Adjust regimen or schedule next IOP check',
    ],
  },
  {
    type: AppointmentType.DIABETIC_EYE_EXAM,
    name: 'Diabetic Eye Exam',
    durationMinutes: 45,
    pretest: [
      'Distance + near VA cc',
      'A1C, BP, current diabetes meds reviewed',
      'IOP both eyes',
    ],
    imaging: ['Dilated fundus photo', 'OCT macula if indicated'],
    carePathway: [
      'Pretest + history',
      'Dilation',
      'Fundus exam + imaging',
      'Send report to PCP / endo',
    ],
  },
  {
    type: AppointmentType.EMERGENCY_VISIT,
    name: 'Red Eye / Emergency Visit',
    durationMinutes: 20,
    pretest: [
      'Onset, side, photophobia, discharge',
      'Distance VA cc',
      'Contact lens wear?',
    ],
    imaging: [],
    carePathway: [
      'Triage at front desk',
      'Tech intake (history, VA)',
      'Slit lamp by OD',
      'Treat, refer or schedule follow-up',
    ],
  },
  {
    type: AppointmentType.MEDICAL_OFFICE_VISIT,
    name: 'Medical Office Visit',
    durationMinutes: 30,
    pretest: ['Distance + near VA cc', 'IOP both eyes', 'Targeted history'],
    imaging: ['Per provider order'],
    carePathway: [
      'Capture history relevant to chief complaint',
      'Targeted slit-lamp / posterior exam',
      'Treat or refer',
      'Schedule appropriate follow-up',
    ],
  },
  {
    type: AppointmentType.OPTICAL_PICKUP,
    name: 'Optical Pickup',
    durationMinutes: 20,
    pretest: ['Verify final Rx', 'Frame selection notes'],
    imaging: [],
    carePathway: [
      'Verify Rx and lens design',
      'Order through preferred lab',
      'Dispense + adjust',
      'Schedule follow-up for fit issues',
    ],
  },
];

export function mergeWorkflowTemplates(
  orgTemplates: {
    appointmentType: AppointmentType;
    name: string;
    durationMinutes: number;
    pretestSteps: string[];
    imagingSteps: string[];
    carePathwaySteps: string[];
  }[],
): VisitWorkflowTemplateData[] {
  const byType = new Map(orgTemplates.map((t) => [t.appointmentType, t]));
  return DEFAULT_WORKFLOW_TEMPLATES.map((def) => {
    const custom = byType.get(def.type);
    if (!custom) return def;
    return {
      type: def.type,
      name: custom.name,
      durationMinutes: custom.durationMinutes,
      pretest: custom.pretestSteps,
      imaging: custom.imagingSteps,
      carePathway: custom.carePathwaySteps,
    };
  });
}
