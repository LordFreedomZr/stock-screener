import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/stocks/fetcher';

export const dynamic = 'force-dynamic';

const TICKER_REGEX = /^[A-Z0-9]{1,10}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    if (!ticker || typeof ticker !== 'string' || !TICKER_REGEX.test(ticker)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker format' },
        { status: 400 }
      );
    }

    const cleanTicker = ticker.toUpperCase();
    const history = await fetchHistory(cleanTicker, '3mo', '1d');

    const snapshots = history.map((h) => ({
      id: `${cleanTicker}-${h.timestamp}`,
      ticker: cleanTicker,
      timestamp: new Date(h.timestamp * 1000).toISOString(),
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
      volume: h.volume,
      turnover: h.close * h.volume,
    }));

    return NextResponse.json({
      success: true,
      data: snapshots,
      count: snapshots.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
