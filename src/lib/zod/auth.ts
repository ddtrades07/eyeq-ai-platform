import { z } from 'zod';
import { email } from './shared';

export const loginSchema = z.object({
  email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupOrgSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email,
  password: z.string().min(8).max(120),
});

export const signupPatientSchema = z.object({
  organizationSlug: z.string().trim().min(2).max(80),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email,
  password: z.string().min(8).max(120),
  dateOfBirth: z.coerce.date(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupOrgInput = z.infer<typeof signupOrgSchema>;
export type SignupPatientInput = z.infer<typeof signupPatientSchema>;
