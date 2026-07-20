import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileContactForm } from '@/components/portal/profile-contact-form';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Profile' };

export default async function PatientProfilePage() {
  const session = await requirePortalPatient();

  const patient = await db.patient.findUniqueOrThrow({
    where: { id: session.patientId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      phone: true,
      addressLine1: true,
      city: true,
      region: true,
      postalCode: true,
      insuranceCarrier: true,
      insuranceMemberId: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your personal details on file with {session.organizationName ?? 'your practice'}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="font-medium">
              {formatFullName(patient.firstName, patient.lastName)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Date of birth</div>
            <div className="font-medium">{formatDate(patient.dateOfBirth)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Insurance</div>
            <div className="font-medium">
              {patient.insuranceCarrier ?? 'Not on file'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Member ID</div>
            <div className="font-medium">{patient.insuranceMemberId ?? 'Not on file'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileContactForm
            initial={{
              phone: patient.phone ?? '',
              email: patient.email ?? '',
              addressLine1: patient.addressLine1 ?? '',
              city: patient.city ?? '',
              region: patient.region ?? '',
              postalCode: patient.postalCode ?? '',
            }}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            To change your name, date of birth, or insurance, contact the office
            so our team can update your records safely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
