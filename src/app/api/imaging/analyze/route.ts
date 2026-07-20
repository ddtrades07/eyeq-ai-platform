import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/require';
import { runStructuredReview } from '@/lib/imaging';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireApiPermission('imaging:review');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { imagingCaseId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.imagingCaseId) {
    return NextResponse.json({ error: 'imagingCaseId required' }, { status: 400 });
  }

  try {
    const review = await runStructuredReview({
      imagingCaseId: body.imagingCaseId,
      organizationId: user.organizationId,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, data: review });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}
