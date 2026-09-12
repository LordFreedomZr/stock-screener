import { NextRequest, NextResponse } from 'next/server';
import {
  getWatchlistItems,
  getWatchlistGroups,
  addWatchlistItem,
  stopWatchlistItem,
} from '@/lib/stocks/watchlist-service';
import { getCurrentUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

function validateTicker(ticker: unknown): ticker is string {
  return (
    typeof ticker === 'string' &&
    ticker.length > 0 &&
    ticker.length <= 10 &&
    /^[A-Z0-9]+$/i.test(ticker)
  );
}

function validateAction(action: unknown): action is 'add' | 'stop' {
  return action === 'add' || action === 'stop';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || undefined;
    const groupsOnly = searchParams.get('groups') === 'true';

    if (groupsOnly) {
      const groups = await getWatchlistGroups(userId);
      return NextResponse.json({ success: true, data: groups });
    }

    const data = await getWatchlistItems(userId, group);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch watchlist';
    console.error('Error fetching watchlist:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    const body = await request.json();
    const { ticker, action, price, score, direction, group } = body;

    if (!validateTicker(ticker)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker format' },
        { status: 400 }
      );
    }

    if (!validateAction(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "add" or "stop"' },
        { status: 400 }
      );
    }

    const cleanTicker = ticker.toUpperCase();

    if (action === 'add') {
      const { item, evaluation } = await addWatchlistItem(cleanTicker, {
        price: typeof price === 'number' && price > 0 ? price : undefined,
        score: typeof score === 'number' ? score : undefined,
        direction: direction === 'bullish' || direction === 'bearish' ? direction : undefined,
        userId,
        group: typeof group === 'string' ? group : 'Default',
      });

      return NextResponse.json({
        success: true,
        data: item,
        evaluation,
        message: `${cleanTicker} berhasil ditambahkan ke watchlist.`,
      });
    } else {
      const stopped = await stopWatchlistItem(cleanTicker, userId);
      if (!stopped) {
        return NextResponse.json(
          { success: false, error: 'Watchlist item not found or already stopped' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${cleanTicker} berhasil dihentikan dari pemantauan aktif.`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update watchlist';
    console.error('Error updating watchlist:', error);

    let status = 500;
    if (message.includes('already active')) status = 409;
    else if (message.includes('not configured')) status = 503;
    else if (message.includes('Invalid')) status = 400;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
