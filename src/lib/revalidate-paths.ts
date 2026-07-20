import { revalidatePath, revalidateTag } from 'next/cache';

function bustOrgDashboardCaches(organizationId?: string | null) {
  if (!organizationId) return;
  revalidateTag(`org:${organizationId}:dashboard`);
  revalidateTag(`org:${organizationId}:notifications`);
}

/** Revalidate all staff views that show appointment data. */
export function revalidateAppointmentViews(patientId?: string, organizationId?: string | null) {
  bustOrgDashboardCaches(organizationId);
  const paths = [
    '/provider/dashboard',
    '/provider/appointments',
    '/provider/scheduling',
    '/provider/patient-flow',
    '/provider/pre-charting',
    '/provider/care-gaps',
    '/provider/reminders',
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
  if (patientId) {
    revalidatePath(`/provider/patients/${patientId}`);
  }
  revalidatePath('/provider/patients');
  revalidatePath('/patient/appointments');
}

/** Revalidate all views that display imaging study data. */
export function revalidateImagingViews(
  patientId?: string,
  imagingCaseId?: string,
  organizationId?: string | null,
) {
  bustOrgDashboardCaches(organizationId);
  const paths = [
    '/provider/dashboard',
    '/provider/imaging',
    '/provider/imaging-timeline',
    '/provider/care-gaps',
    '/provider/admin-insights',
    '/provider/pre-charting',
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
  if (patientId) {
    revalidatePath(`/provider/patients/${patientId}`);
    revalidatePath(`/provider/timeline-intelligence/${patientId}`);
  }
  if (imagingCaseId) {
    revalidatePath(`/provider/imaging/${imagingCaseId}`);
  }
  revalidatePath('/patient/visits');
}
