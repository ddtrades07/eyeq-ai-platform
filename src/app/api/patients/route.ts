import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { createPatient } from '@/server/actions/patients';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireApiPermission('patients:read');
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const take = Math.min(Number(searchParams.get('take') ?? '50'), 200);

  const data = await db.patient.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take,
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createPatient(body);
  return NextResponse.json(result, { status: result.ok ? 201 : result.status ?? 400 });
}
