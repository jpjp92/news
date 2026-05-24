import { NextResponse } from 'next/server';
import { getArticles } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'today';
  logger.info('[API] GET /api/history/articles', { period });
  const result = await getArticles(period);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
