import { z } from 'zod';
import { cuid, email, phone } from './shared';

export const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.coerce.date(),
  email: email.optional().nullable().or(z.literal('')),
  phone: phone.optional().nullable().or(z.literal('')),
  addressLine1: z.string().max(120).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  region: z.string().max(40).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  insuranceCarrier: z.string().max(120).optional().nullable(),
  insuranceMemberId: z.string().max(120).optional().nullable(),
  preferredLanguage: z.string().max(10).default('en'),
  hasDiabetes: z.boolean().default(false),
  hasHypertension: z.boolean().default(false),
  hasGlaucomaPersonal: z.boolean().default(false),
  hasGlaucomaFamily: z.boolean().default(false),
  isSmoker: z.boolean().default(false),
  notes: z.string().max(4000).optional().nullable(),
});
export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

export const patientUpdateSchema = patientCreateSchema.partial().extend({
  id: cuid,
});
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export const patientSearchSchema = z.object({
  q: z.string().max(200).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
