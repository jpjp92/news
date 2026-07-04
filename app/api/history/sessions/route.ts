import { NextResponse } from 'next/server';
import { getSessions } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set(['today', '7d', '30d', 'all']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    if (!VALID_PERIODS.has(period)) {
      logger.warn('[API] Invalid period for sessions', { period });
      return NextResponse.json({ success: false }, { status: 400 });
    }
    logger.info('[API] GET /api/history/sessions', { period });
    const result = await getSessions(period);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/sessions failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
