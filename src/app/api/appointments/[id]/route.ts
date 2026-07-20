import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import {
  cancelAppointment,
  updateAppointment,
} from '@/server/actions/appointments';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiPermission('appointments:read');
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt || appt.organizationId !== user.organizationId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ data: appt });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await updateAppointment({ ...body, id });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status ?? 400 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await cancelAppointment({ id, reason: body?.reason ?? null });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status ?? 400 });
}
