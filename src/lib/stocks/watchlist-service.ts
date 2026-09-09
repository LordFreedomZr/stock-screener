import { createClient } from '@supabase/supabase-js';
import {
  fetchTradingViewQuote,
  fetchTradingViewQuotesBatch,
  TradingViewQuote,
} from './tradingview-fetcher';
import { FALLBACK_STOCKS } from './idx-tickers';
import { WatchlistItem, WatchlistEvaluation } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = () =>
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder');

const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Admin client with service role key (bypasses RLS) - only for stock registration
const supabaseAdmin =
  isSupabaseConfigured() && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Ensure ticker exists in stocks table. Insert if not found.
 */
async function ensureStockExists(ticker: string): Promise<void> {
  if (!supabase) return;

  const { data: existing } = await supabase
    .from('stocks')
    .select('ticker')
    .eq('ticker', ticker)
    .maybeSingle();

  if (existing) return;

  const fallback = FALLBACK_STOCKS.find((s) => s.ticker === ticker);
  const name = fallback?.name || ticker;
  const sector = fallback?.sector || 'Unknown';

  // Use admin client to bypass RLS for stock registration
  const client = supabaseAdmin || supabase;
  const { error } = await client
    .from('stocks')
    .insert({ ticker, name, sector, is_active: true });

  if (error) {
    console.error(`Failed to insert stock ${ticker}:`, error);
    throw new Error(`Failed to register stock ${ticker}: ${error.message}`);
  }
}

export function determineEvaluationStatus(
  direction: 'bullish' | 'bearish',
  priceMovementPercent: number
): 'benar' | 'floating' | 'meleset' {
  if (priceMovementPercent >= -2 && priceMovementPercent <= 2) return 'floating';
  if (direction === 'bullish') return priceMovementPercent > 2 ? 'benar' : 'meleset';
  return priceMovementPercent < -2 ? 'benar' : 'meleset';
}

/**
 * Get all watchlist items with their latest evaluation.
 */
export async function getWatchlistItems(userId?: string | null): Promise<WatchlistItem[]> {
  if (!supabase) {
    console.error('Supabase not configured - cannot fetch watchlist');
    return [];
  }

  let query = supabase
    .from('watchlist_items')
    .select('*')
    .order('marked_at', { ascending: false });

  // Filter by user_id if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: items, error: itemsError } = await query;

  if (itemsError) {
    console.error('Error fetching watchlist items:', itemsError);
    throw new Error(`Failed to fetch watchlist: ${itemsError.message}`);
  }

  if (!items || items.length === 0) return [];

  // Batch fetch all evaluations in one query
  const itemIds = items.map((i) => i.id);
  const { data: allEvals, error: evalsError } = await supabase
    .from('watchlist_evaluations')
    .select('*')
    .in('watchlist_item_id', itemIds)
    .order('timestamp', { ascending: false });

  if (evalsError) {
    console.error('Error fetching evaluations:', evalsError);
    // Return items without evaluations rather than failing completely
    return items.map((item) => ({ ...item, latest_evaluation: null })) as unknown as WatchlistItem[];
  }

  // Group evaluations by item_id, pick latest per item
  const evalByItem = new Map<string, WatchlistEvaluation>();
  for (const ev of allEvals || []) {
    const existing = evalByItem.get(ev.watchlist_item_id);
    if (!existing || new Date(ev.timestamp) > new Date(existing.timestamp)) {
      evalByItem.set(ev.watchlist_item_id, ev as unknown as WatchlistEvaluation);
    }
  }

  return items.map((item) => ({
    ...item,
    latest_evaluation: evalByItem.get(item.id) || null,
  })) as unknown as WatchlistItem[];
}

/**
 * Add a stock to watchlist. Supabase only - no local fallback.
 */
export async function addWatchlistItem(
  ticker: string,
  options?: { price?: number; score?: number; direction?: 'bullish' | 'bearish'; userId?: string | null }
): Promise<{ item: WatchlistItem; evaluation: WatchlistEvaluation }> {
  if (!supabase) {
    throw new Error('Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const userId = options?.userId;

  // Ensure ticker exists in stocks table (required for FK constraint)
  await ensureStockExists(ticker);

  let price = options?.price;
  const score = options?.score ?? 3;
  let direction = options?.direction ?? 'bullish';

  // Fetch real-time price from TradingView if not provided
  if (!price || price <= 0) {
    try {
      const tvQuote = await fetchTradingViewQuote(ticker);
      if (tvQuote && tvQuote.price > 0) {
        price = tvQuote.price;
        if (!options?.direction) {
          direction = tvQuote.changePercent >= 0 ? 'bullish' : 'bearish';
        }
      }
    } catch (err) {
      console.warn('Failed to fetch TradingView quote for price:', err);
    }
    if (!price || price <= 0) price = 1000; // Final fallback
  }

  const nowIso = new Date().toISOString();

  // Check if already active (for this user)
  let activeQuery = supabase
    .from('watchlist_items')
    .select('id')
    .eq('ticker', ticker)
    .eq('status', 'active');

  if (userId) {
    activeQuery = activeQuery.eq('user_id', userId);
  }

  const { data: existingActive, error: checkError } = await activeQuery.maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check watchlist: ${checkError.message}`);
  }

  if (existingActive) {
    throw new Error('Stock already active in watchlist');
  }

  // Check if there's a stopped entry to reactivate (for this user)
  let stoppedQuery = supabase
    .from('watchlist_items')
    .select('id')
    .eq('ticker', ticker)
    .eq('status', 'stopped');

  if (userId) {
    stoppedQuery = stoppedQuery.eq('user_id', userId);
  }

  const { data: existingStopped } = await stoppedQuery.maybeSingle();

  let targetItem: Record<string, unknown>;

  if (existingStopped) {
    // Reactivate stopped entry
    const { data: updated, error: updateError } = await supabase
      .from('watchlist_items')
      .update({ status: 'active', stopped_at: null, marked_at: nowIso })
      .eq('id', existingStopped.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to reactivate watchlist item: ${updateError.message}`);
    }
    targetItem = updated;
  } else {
    // Insert new entry
    const { data: inserted, error: insertError } = await supabase
      .from('watchlist_items')
      .insert({ ticker, status: 'active', marked_at: nowIso, user_id: userId })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add watchlist item: ${insertError.message}`);
    }
    targetItem = inserted;
  }

  // Create initial evaluation
  const initialEval: WatchlistEvaluation = {
    id: crypto.randomUUID(),
    watchlist_item_id: targetItem.id as string,
    ticker,
    timestamp: nowIso,
    current_price: price,
    entry_price: price,
    price_movement_percent: 0,
    price_movement_nominal: 0,
    analysis_score: score,
    analysis_direction: direction,
    status: 'floating',
    notes: `Entry awal ditambahkan pada harga Rp ${price.toLocaleString('id-ID')}`,
  };

  const { error: evalInsertError } = await supabase.from('watchlist_evaluations').insert({
    id: initialEval.id,
    watchlist_item_id: targetItem.id,
    ticker,
    timestamp: initialEval.timestamp,
    current_price: initialEval.current_price,
    price_movement_percent: initialEval.price_movement_percent,
    price_movement_nominal: initialEval.price_movement_nominal,
    analysis_score: initialEval.analysis_score,
    analysis_direction: initialEval.analysis_direction,
    status: initialEval.status,
    notes: initialEval.notes,
  });

  if (evalInsertError) {
    console.error('Failed to insert initial evaluation:', evalInsertError);
    // Item was added but evaluation failed - still return success
  }

  return {
    item: { ...targetItem, latest_evaluation: initialEval } as unknown as WatchlistItem,
    evaluation: initialEval,
  };
}

/**
 * Stop watching an item.
 */
export async function stopWatchlistItem(ticker: string, userId?: string | null): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const nowIso = new Date().toISOString();
  let query = supabase
    .from('watchlist_items')
    .update({ status: 'stopped', stopped_at: nowIso })
    .eq('ticker', ticker)
    .eq('status', 'active');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to stop watchlist item: ${error.message}`);
  }

  return true;
}

/**
 * Evaluates active watchlist items against real-time live prices.
 */
export async function evaluateWatchlist(filterTicker?: string, userId?: string | null): Promise<{
  items: WatchlistItem[];
  summary: { total: number; benar: number; floating: number; meleset: number; hitRate: number };
}> {
  const currentItems = await getWatchlistItems(userId);
  const activeItems = currentItems.filter(
    (i) => i.status === 'active' && (!filterTicker || i.ticker === filterTicker)
  );

  if (activeItems.length === 0) {
    return {
      items: currentItems,
      summary: { total: 0, benar: 0, floating: 0, meleset: 0, hitRate: 0 },
    };
  }

  const nowIso = new Date().toISOString();
  const updatedEvals: WatchlistEvaluation[] = [];

  // Batch-fetch all active tickers in 1 request
  let tvQuotes: Record<string, TradingViewQuote> = {};
  try {
    tvQuotes = await fetchTradingViewQuotesBatch(activeItems.map((i) => i.ticker));
  } catch (err) {
    console.warn('TradingView batch quote error:', err);
  }

  for (const item of activeItems) {
    try {
      const tvQuote = tvQuotes[item.ticker];
      const currentPrice = tvQuote?.price || 0;
      if (currentPrice <= 0) continue;

      const entryPrice =
        item.entry_price ||
        item.latest_evaluation?.entry_price ||
        item.latest_evaluation?.current_price ||
        currentPrice;

      const direction: 'bullish' | 'bearish' =
        item.entry_direction ||
        item.latest_evaluation?.analysis_direction ||
        ((tvQuote?.changePercent || 0) >= 0 ? 'bullish' : 'bearish');

      const score = item.entry_score || item.latest_evaluation?.analysis_score || 3;

      const priceMovementNominal = currentPrice - entryPrice;
      const priceMovementPercent = entryPrice > 0 ? (priceMovementNominal / entryPrice) * 100 : 0;
      const status = determineEvaluationStatus(direction, priceMovementPercent);

      const evaluationRecord: WatchlistEvaluation = {
        id: crypto.randomUUID(),
        watchlist_item_id: item.id,
        ticker: item.ticker,
        timestamp: nowIso,
        current_price: currentPrice,
        entry_price: entryPrice,
        price_movement_percent: Math.round(priceMovementPercent * 100) / 100,
        price_movement_nominal: priceMovementNominal,
        analysis_score: score,
        analysis_direction: direction,
        status,
        notes: `Live Eval: Rp ${currentPrice.toLocaleString('id-ID')} vs Entry Rp ${entryPrice.toLocaleString('id-ID')} (${priceMovementPercent >= 0 ? '+' : ''}${priceMovementPercent.toFixed(2)}%)`,
      };

      updatedEvals.push(evaluationRecord);

      if (supabase) {
        const { error: insertErr } = await supabase.from('watchlist_evaluations').insert({
          id: evaluationRecord.id,
          watchlist_item_id: item.id,
          ticker: item.ticker,
          timestamp: evaluationRecord.timestamp,
          current_price: evaluationRecord.current_price,
          price_movement_percent: evaluationRecord.price_movement_percent,
          price_movement_nominal: evaluationRecord.price_movement_nominal,
          analysis_score: evaluationRecord.analysis_score,
          analysis_direction: evaluationRecord.analysis_direction,
          status: evaluationRecord.status,
          notes: evaluationRecord.notes,
        });
        if (insertErr) {
          console.error(`Failed to insert evaluation for ${item.ticker}:`, insertErr);
        }
      }
    } catch (err) {
      console.error(`Error evaluating ${item.ticker}:`, err);
    }
  }

  // Re-fetch all items with fresh evaluations
  const refreshedItems = await getWatchlistItems();
  const total = refreshedItems.length;
  const benar = refreshedItems.filter((i) => i.latest_evaluation?.status === 'benar').length;
  const floating = refreshedItems.filter((i) => i.latest_evaluation?.status === 'floating').length;
  const meleset = refreshedItems.filter((i) => i.latest_evaluation?.status === 'meleset').length;
  const hitRate = total > 0 ? (benar / total) * 100 : 0;

  if (supabase) {
    try {
      const statsData = {
        indicator: 'Overall System',
        combination: 'TradingView Real-Time Feed',
        score_range: '1-5',
        total_evaluations: total,
        correct_count: benar,
        floating_count: floating,
        missed_count: meleset,
        hit_rate: Math.round(hitRate * 100) / 100,
        updated_at: nowIso,
      };

      // Use admin client to bypass RLS for accuracy_stats
      const adminClient = supabaseAdmin || supabase;

      // Check if row exists first (no UNIQUE constraint on indicator)
      const { data: existing } = await adminClient
        .from('accuracy_stats')
        .select('id')
        .eq('indicator', 'Overall System')
        .maybeSingle();

      if (existing) {
        await adminClient
          .from('accuracy_stats')
          .update(statsData)
          .eq('id', existing.id);
      } else {
        await adminClient
          .from('accuracy_stats')
          .insert({ id: crypto.randomUUID(), ...statsData });
      }
    } catch (err) {
      console.error('Failed to update accuracy stats:', err);
    }
  }

  return {
    items: refreshedItems,
    summary: { total, benar, floating, meleset, hitRate },
  };
}
