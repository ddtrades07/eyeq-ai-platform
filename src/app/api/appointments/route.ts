import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/require';
import { listAppointments } from '@/server/queries/appointments';
import { appointmentListSchema } from '@/lib/zod/appointment';
import { createAppointment } from '@/server/actions/appointments';
import { resolveActiveLocationId } from '@/lib/location/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireApiPermission('appointments:read');
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = appointmentListSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const data = await listAppointments({
    organizationId: user.organizationId,
    locationId: parsed.data.locationId ?? locationId,
    from: parsed.data.from,
    to: parsed.data.to,
    status: parsed.data.status,
    providerId: parsed.data.providerId,
    patientId: parsed.data.patientId,
    search: parsed.data.search,
    take: parsed.data.take,
    skip: parsed.data.skip,
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createAppointment(body);
  return NextResponse.json(result, { status: result.ok ? 201 : result.status ?? 400 });
}
