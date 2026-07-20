import { z } from 'zod';
import {
  AppointmentStatus,
  AppointmentType,
} from '@prisma/client';
import { cuid } from './shared';

export const appointmentCreateSchema = z
  .object({
    patientId: cuid,
    providerId: cuid.optional().nullable(),
    locationId: cuid.optional().nullable(),
    type: z.nativeEnum(AppointmentType),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(5).max(480).default(45),
    reason: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    dilationNeeded: z.boolean().default(false),
    imagingNeeded: z.array(z.string()).default([]),
  })
  .refine((v) => !Number.isNaN(v.startsAt.getTime()), {
    message: 'Invalid start time',
    path: ['startsAt'],
  });

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;

export const appointmentUpdateSchema = z.object({
  id: cuid,
  patientId: cuid.optional(),
  providerId: cuid.optional().nullable(),
  locationId: cuid.optional().nullable(),
  type: z.nativeEnum(AppointmentType).optional(),
  startsAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  dilationNeeded: z.boolean().optional(),
  imagingNeeded: z.array(z.string()).optional(),
});
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;

export const appointmentStatusSchema = z.object({
  id: cuid,
  status: z.nativeEnum(AppointmentStatus),
  cancelReason: z.string().max(500).optional().nullable(),
});

export const appointmentDeleteSchema = z.object({
  id: cuid,
  reason: z.string().max(500).optional().nullable(),
});

export const appointmentListSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  providerId: cuid.optional(),
  locationId: cuid.optional(),
  patientId: cuid.optional(),
  search: z.string().max(200).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});
export type AppointmentListInput = z.infer<typeof appointmentListSchema>;
