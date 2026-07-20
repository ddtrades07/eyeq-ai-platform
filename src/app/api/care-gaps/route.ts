import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/require';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireApiPermission('caregaps:read');
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get('take') ?? '100'), 500);

  const data = await db.careGap.findMany({
    where: {
      organizationId: user.organizationId,
      status: { in: ['DUE', 'OVERDUE', 'CONTACTED'] },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    take,
  });

  return NextResponse.json({ data });
}
