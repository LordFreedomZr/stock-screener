import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleStock, DEFAULT_SCORE_CONFIG } from '@/lib/stocks/tradingview-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
    const { searchParams } = new URL(request.url);
    const enabledParam = searchParams.get('enabled');
    const enabledIndicators = enabledParam
      ? enabledParam.split(',').filter(Boolean)
      : ['rsi', 'macd', 'roc', 'rvol', 'atr'];

    const stock = await fetchSingleStock(ticker, DEFAULT_SCORE_CONFIG, enabledIndicators);

    if (!stock) {
      return NextResponse.json(
        { success: false, error: `Stock ${ticker} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: stock });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
