import { NextResponse } from 'next/server';
import { getArticles } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set(['today', '7d', '30d']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    if (!VALID_PERIODS.has(period)) {
      logger.warn('[API] Invalid period for articles', { period });
      return NextResponse.json({ success: false }, { status: 400 });
    }
    logger.info('[API] GET /api/history/articles', { period });
    const result = await getArticles(period);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/articles failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
