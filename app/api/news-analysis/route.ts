import { NextResponse } from 'next/server';
import { analyzeNews } from '@/src/lib/server/newsService';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('[API] GET /api/news-analysis');
    const result = await analyzeNews();
    return NextResponse.json(result);
  } catch (error: any) {
    const httpStatus: number = error?.httpStatus || 500;
    logger.error('[API] GET /api/news-analysis failed', { message: error?.message, httpStatus });
    return NextResponse.json(
      { success: false, httpStatus },
      { status: httpStatus },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    logger.info('[API] POST /api/news-analysis', body);
    const result = await analyzeNews(body || {});
    return NextResponse.json(result);
  } catch (error: any) {
    const httpStatus: number = error?.httpStatus || 500;
    logger.error('[API] POST /api/news-analysis failed', { message: error?.message, httpStatus });
    return NextResponse.json(
      { success: false, httpStatus },
      { status: httpStatus },
    );
  }
}
