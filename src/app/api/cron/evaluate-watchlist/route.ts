import { NextResponse } from 'next/server';
import { evaluateWatchlist } from '@/lib/stocks/watchlist-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Verify cron secret (for security)
    const expectedSecret = process.env.CRON_SECRET || 'screener_secret_key_2026';
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Cron triggered: evaluating watchlist...');
    const result = await evaluateWatchlist();

    return NextResponse.json({
      success: true,
      message: `Evaluated ${result.items.length} items`,
      summary: result.summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in evaluate-watchlist cron:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
