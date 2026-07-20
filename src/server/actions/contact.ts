'use server';

import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  role: z.enum(['practice', 'patient', 'other']),
  message: z.string().min(10).max(4000),
});

export type ContactFormState =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function submitContactIntro(_prev: ContactFormState | null, formData: FormData): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    message: formData.get('message'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please check the form and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Production: wire to CRM, email, or ticketing. For now, acknowledge honestly.
  console.info('[contact] introduction request', {
    role: parsed.data.role,
    email: parsed.data.email,
    nameLength: parsed.data.name.length,
  });

  return {
    ok: true,
    message:
      'Thank you, we received your message. A member of our team will respond when introduction requests are being scheduled. For urgent patient care, please contact your eye care provider directly.',
  };
}
