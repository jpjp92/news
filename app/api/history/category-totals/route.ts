import { NextResponse } from 'next/server';
import { getCategoryTotals } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set(['all', 'today', '7d', '30d']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    if (!VALID_PERIODS.has(period)) {
      logger.warn('[API] Invalid period for category-totals', { period });
      return NextResponse.json({ success: false }, { status: 400 });
    }
    logger.info('[API] GET /api/history/category-totals', { period });
    const result = await getCategoryTotals(period);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/category-totals failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
