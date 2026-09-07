import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/stocks/fetcher';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    
    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker' },
        { status: 400 }
      );
    }

    const history = await fetchHistory(ticker, '3mo', '1d');
    
    // Convert to PriceSnapshot format
    const snapshots = history.map(h => ({
      id: `${ticker}-${h.timestamp}`,
      ticker: ticker,
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
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
