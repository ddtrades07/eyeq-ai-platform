import { z } from 'zod';

export const cuid = z.string().min(1, 'Required').max(64);
export const isoDate = z.string().datetime({ offset: true }).or(z.date());
export const phone = z
  .string()
  .trim()
  .min(7, 'Phone is too short')
  .max(32);
export const email = z.string().trim().toLowerCase().email();
