import { requirePortalPatient } from '@/lib/auth/portal';
import { BookAppointmentForm } from '@/components/portal/book-appointment-form';

export const metadata = { title: 'Book Appointment' };

export default async function BookAppointmentPage() {
  await requirePortalPatient();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Book an appointment</h2>
        <p className="text-sm text-muted-foreground">
          Tell us when works for you and our team will confirm your visit time.
        </p>
      </div>
      <BookAppointmentForm />
    </div>
  );
}
