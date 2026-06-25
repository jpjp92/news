import { NextResponse } from 'next/server';
import { getStats } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('[API] GET /api/history/stats');
    const result = await getStats();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/stats failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
