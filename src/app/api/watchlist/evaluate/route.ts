import { NextResponse } from 'next/server';
import { evaluateWatchlist } from '@/lib/stocks/watchlist-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || undefined;

    const result = await evaluateWatchlist(ticker);

    return NextResponse.json({
      success: true,
      data: result.items,
      summary: result.summary,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in evaluate watchlist GET:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to evaluate watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let ticker: string | undefined = undefined;
    try {
      const body = await request.json();
      if (body && typeof body.ticker === 'string') {
        ticker = body.ticker.toUpperCase();
      }
    } catch {
      // Body is optional
    }

    const result = await evaluateWatchlist(ticker);

    return NextResponse.json({
      success: true,
      data: result.items,
      summary: result.summary,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in evaluate watchlist POST:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to evaluate watchlist' },
      { status: 500 }
    );
  }
}
