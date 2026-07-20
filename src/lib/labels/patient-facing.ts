import type { AppointmentStatus } from '@prisma/client';

/** Plain-language labels for patients. Never use internal staff terminology. */
export const PATIENT_APPOINTMENT_STATUS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  IN_PRETEST: 'Getting ready for your exam',
  WITH_DOCTOR: 'With your eye doctor',
  IN_OPTICAL: 'Optical pickup',
  COMPLETED: 'Completed',
  NO_SHOW: 'Missed visit',
  CANCELLED: 'Cancelled',
};

export const MESSAGE_CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  clinical: 'Health concern',
  scheduling: 'Scheduling',
  billing: 'Billing',
  rx: 'Prescriptions',
};

export function humanizeVisitType(type: string) {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
