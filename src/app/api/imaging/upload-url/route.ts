import { NextResponse } from 'next/server';
import { requestImagingUpload } from '@/server/actions/imaging';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await requestImagingUpload(body);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status ?? 400 });
}
