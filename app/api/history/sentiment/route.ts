import { NextResponse } from 'next/server';
import { getSentiment } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set(['7d', '30d', 'all']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    if (!VALID_PERIODS.has(period)) {
      logger.warn('[API] Invalid period for sentiment', { period });
      return NextResponse.json({ success: false }, { status: 400 });
    }
    logger.info('[API] GET /api/history/sentiment', { period });
    const result = await getSentiment(period);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/sentiment failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
