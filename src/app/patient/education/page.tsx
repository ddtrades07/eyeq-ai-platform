import { redirect } from 'next/navigation';

/** Legacy patient education route → Eye Health Library */
export default function LegacyPatientEducationRedirect() {
  redirect('/patient/eye-health-library');
}
