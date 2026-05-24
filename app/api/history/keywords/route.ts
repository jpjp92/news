import { NextResponse } from 'next/server';
import { getKeywords } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';
  logger.info('[API] GET /api/history/keywords', { period });
  const result = await getKeywords(period);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
