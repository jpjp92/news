import { NextResponse } from 'next/server';
import { getLatestSession } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('[API] GET /api/history/latest-session');
    const result = await getLatestSession();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    logger.error('[API] GET /api/history/latest-session failed', error?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
