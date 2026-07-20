import 'server-only';
import type { AuditAction, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { headers } from 'next/headers';

export type AuditPayload = {
  organizationId?: string | null;
  userId?: string | null;
  patientId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  success?: boolean;
  previousStatus?: string | null;
  newStatus?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/** Best-effort request context for audit enrichment. */
export async function auditRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const fwd = h.get('x-forwarded-for');
    return {
      ipAddress: fwd?.split(',')[0]?.trim() ?? h.get('x-real-ip'),
      userAgent: h.get('user-agent'),
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Writes a single audit event. Failures never block the originating operation.
 */
export async function audit(payload: AuditPayload): Promise<void> {
  const ctx =
    payload.ipAddress == null && payload.userAgent == null
      ? await auditRequestContext()
      : { ipAddress: payload.ipAddress ?? null, userAgent: payload.userAgent ?? null };

  const event = {
    ...payload,
    ipAddress: payload.ipAddress ?? ctx.ipAddress,
    userAgent: payload.userAgent ?? ctx.userAgent,
    success: payload.success ?? true,
    metadata: payload.metadata ?? undefined,
    at: new Date().toISOString(),
  };

  if (serverEnv.auditLogSink === 'stdout') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ kind: 'audit', ...event }));
    return;
  }

  if (serverEnv.auditLogSink === 'external') {
    const url = serverEnv.auditWebhookUrl;
    if (url) {
      try {
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
        if (serverEnv.auditWebhookSecret) {
          hdrs.Authorization = `Bearer ${serverEnv.auditWebhookSecret}`;
        }
        await fetch(url, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({ kind: 'audit', ...event }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[audit] external webhook failed', err);
      }
    }
  }

  if (serverEnv.auditLogSink === 'external' || serverEnv.auditLogSink === 'db') {
    try {
      await db.auditLog.create({
        data: {
          organizationId: payload.organizationId ?? null,
          userId: payload.userId ?? null,
          patientId: payload.patientId ?? null,
          action: payload.action,
          resourceType: payload.resourceType,
          resourceId: payload.resourceId ?? null,
          success: payload.success ?? true,
          previousStatus: payload.previousStatus ?? null,
          newStatus: payload.newStatus ?? null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: (payload.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[audit] failed to record event', err, event);
    }
  }
}
