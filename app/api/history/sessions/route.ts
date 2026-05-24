import { NextResponse } from 'next/server';
import { getSessions } from '@/src/lib/server/newsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';
  const result = await getSessions(period);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
