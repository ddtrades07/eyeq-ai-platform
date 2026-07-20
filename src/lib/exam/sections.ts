/**
 * Optometry exam chart section catalog (47 sections).
 * Each section maps to a key in ExamChart.sectionData JSON.
 */

export type ExamSectionCategory =
  | 'demographics'
  | 'history'
  | 'subjective'
  | 'refraction'
  | 'anterior'
  | 'posterior'
  | 'diagnosis'
  | 'plan'
  | 'admin';

export type ExamSectionDef = {
  key: string;
  label: string;
  category: ExamSectionCategory;
  /** When true, data may live on Patient rather than per-encounter sectionData */
  patientLevel?: boolean;
  fieldType: 'text' | 'textarea' | 'boolean' | 'select' | 'readonly';
  normalMacro?: string;
};

export const EXAM_SECTIONS: ExamSectionDef[] = [
  { key: 'demographics', label: 'Demographics', category: 'demographics', patientLevel: true, fieldType: 'readonly' },
  { key: 'contact_info', label: 'Contact info', category: 'demographics', patientLevel: true, fieldType: 'readonly' },
  { key: 'emergency_contacts', label: 'Emergency contacts', category: 'demographics', fieldType: 'textarea' },
  { key: 'insurance', label: 'Insurance', category: 'demographics', patientLevel: true, fieldType: 'text' },
  { key: 'vision_plans', label: 'Vision plans', category: 'demographics', fieldType: 'text' },
  { key: 'medical_history', label: 'Medical history', category: 'history', fieldType: 'textarea' },
  { key: 'ocular_history', label: 'Ocular history', category: 'history', fieldType: 'textarea' },
  { key: 'family_history', label: 'Family history', category: 'history', fieldType: 'textarea' },
  { key: 'medications', label: 'Medications', category: 'history', fieldType: 'textarea' },
  { key: 'allergies', label: 'Allergies', category: 'history', fieldType: 'textarea' },
  { key: 'surgical_history', label: 'Surgical history', category: 'history', fieldType: 'textarea' },
  { key: 'social_history', label: 'Social history', category: 'history', fieldType: 'textarea' },
  { key: 'chief_complaint', label: 'Chief complaint', category: 'subjective', fieldType: 'text' },
  { key: 'hpi', label: 'HPI', category: 'subjective', fieldType: 'textarea' },
  { key: 'review_of_systems', label: 'Review of systems', category: 'subjective', fieldType: 'textarea' },
  { key: 'visual_acuity', label: 'Visual acuity', category: 'refraction', fieldType: 'text', normalMacro: 'OD 20/20 cc, OS 20/20 cc' },
  { key: 'pupils', label: 'Pupils', category: 'anterior', fieldType: 'text', normalMacro: 'PERRLA, no APD' },
  { key: 'eom', label: 'Extraocular motility', category: 'anterior', fieldType: 'text', normalMacro: 'Full, smooth, no pain' },
  { key: 'confrontation_vf', label: 'Confrontation VF', category: 'anterior', fieldType: 'text', normalMacro: 'Full to confrontation OU' },
  { key: 'cover_test', label: 'Cover testing', category: 'refraction', fieldType: 'text', normalMacro: 'Orthophoria at distance and near' },
  { key: 'stereopsis', label: 'Stereopsis', category: 'refraction', fieldType: 'text' },
  { key: 'color_vision', label: 'Color vision', category: 'refraction', fieldType: 'text', normalMacro: 'Normal Ishihara OU' },
  { key: 'keratometry', label: 'Keratometry', category: 'refraction', fieldType: 'text' },
  { key: 'autorefraction', label: 'Autorefraction', category: 'refraction', fieldType: 'text' },
  { key: 'manifest_refraction', label: 'Manifest refraction', category: 'refraction', fieldType: 'text' },
  { key: 'cycloplegic_refraction', label: 'Cycloplegic refraction', category: 'refraction', fieldType: 'text' },
  { key: 'final_refraction', label: 'Final refraction', category: 'refraction', fieldType: 'text' },
  { key: 'contact_lens_eval', label: 'Contact lens evaluation', category: 'refraction', fieldType: 'textarea' },
  { key: 'slit_lamp', label: 'Slit lamp findings', category: 'anterior', fieldType: 'textarea', normalMacro: 'Lids/lashes WNL, conj clear, cornea clear, AC quiet' },
  { key: 'iop', label: 'IOP', category: 'anterior', fieldType: 'text', normalMacro: 'OD ___ mmHg, OS ___ mmHg' },
  { key: 'gonioscopy', label: 'Gonioscopy', category: 'anterior', fieldType: 'text' },
  { key: 'pachymetry', label: 'Pachymetry', category: 'anterior', fieldType: 'text' },
  { key: 'dilation', label: 'Dilation', category: 'anterior', fieldType: 'select' },
  { key: 'posterior_segment', label: 'Posterior segment', category: 'posterior', fieldType: 'textarea' },
  { key: 'optic_nerve', label: 'Optic nerve', category: 'posterior', fieldType: 'textarea', normalMacro: 'CD 0.3 OU, pink, sharp margins' },
  { key: 'macula', label: 'Macula', category: 'posterior', fieldType: 'textarea', normalMacro: 'Flat, intact, no hemorrhage' },
  { key: 'peripheral_retina', label: 'Peripheral retina', category: 'posterior', fieldType: 'textarea', normalMacro: 'Attached, no tears/holes' },
  { key: 'imaging_results', label: 'Imaging results', category: 'posterior', fieldType: 'textarea' },
  { key: 'diagnoses', label: 'Diagnoses (ICD)', category: 'diagnosis', fieldType: 'textarea' },
  { key: 'assessment', label: 'Assessment', category: 'diagnosis', fieldType: 'textarea' },
  { key: 'plan', label: 'Plan', category: 'plan', fieldType: 'textarea' },
  { key: 'orders', label: 'Orders', category: 'plan', fieldType: 'textarea' },
  { key: 'referrals', label: 'Referrals', category: 'plan', fieldType: 'textarea' },
  { key: 'patient_education', label: 'Patient education', category: 'plan', fieldType: 'textarea' },
  { key: 'follow_up', label: 'Follow-up', category: 'plan', fieldType: 'text' },
  { key: 'provider_signature', label: 'Provider signature', category: 'admin', fieldType: 'readonly' },
  { key: 'addendum', label: 'Addendum', category: 'admin', fieldType: 'textarea' },
];

export const EXAM_SECTION_MAP = Object.fromEntries(
  EXAM_SECTIONS.map((s) => [s.key, s]),
) as Record<string, ExamSectionDef>;

export const EXAM_CATEGORIES: { id: ExamSectionCategory; label: string }[] = [
  { id: 'demographics', label: 'Demographics & intake' },
  { id: 'history', label: 'History' },
  { id: 'subjective', label: 'Subjective' },
  { id: 'refraction', label: 'Refraction & vision testing' },
  { id: 'anterior', label: 'Anterior segment' },
  { id: 'posterior', label: 'Posterior segment & imaging' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'plan', label: 'Plan & orders' },
  { id: 'admin', label: 'Sign-off' },
];

export type ExamSectionData = Record<string, string | boolean | null>;

export function sectionsForCategory(category: ExamSectionCategory): ExamSectionDef[] {
  return EXAM_SECTIONS.filter((s) => s.category === category);
}
