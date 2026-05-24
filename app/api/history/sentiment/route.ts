import { NextResponse } from 'next/server';
import { getSentiment } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';
  logger.info('[API] GET /api/history/sentiment', { period });
  const result = await getSentiment(period);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
