import { NextResponse } from 'next/server';
import { evaluateWatchlist } from '@/lib/stocks/watchlist-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await evaluateWatchlist();

    return NextResponse.json({
      success: true,
      message: `Evaluated ${result.items.length} items`,
      summary: result.summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in evaluate-watchlist cron:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
