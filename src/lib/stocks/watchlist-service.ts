import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  fetchTradingViewQuote,
  fetchTradingViewQuotesBatch,
  TradingViewQuote,
} from './tradingview-fetcher';
import { WatchlistItem, WatchlistEvaluation } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () =>
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder');

const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'watchlist_store.json');

interface LocalStore {
  items: WatchlistItem[];
  evaluations: WatchlistEvaluation[];
}

function ensureDataFile(): LocalStore {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      const initial: LocalStore = { items: [], evaluations: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as LocalStore;
  } catch {
    return { items: [], evaluations: [] };
  }
}

function saveLocalStore(store: LocalStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving local watchlist store:', error);
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
 * Uses batch query to avoid N+1 problem.
 */
export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  if (supabase) {
    try {
      const { data: items, error } = await supabase
        .from('watchlist_items')
        .select('*')
        .order('marked_at', { ascending: false });

      if (error || !items) throw error;

      // Batch fetch all evaluations in one query (fixes N+1)
      const itemIds = items.map((i: { id: string }) => i.id);
      const { data: allEvals } = await supabase
        .from('watchlist_evaluations')
        .select('*')
        .in('watchlist_item_id', itemIds)
        .order('timestamp', { ascending: false });

      // Group evaluations by item_id, pick latest per item
      const evalByItem = new Map<string, WatchlistEvaluation>();
      for (const ev of allEvals || []) {
        const existing = evalByItem.get(ev.watchlist_item_id);
        if (!existing || new Date(ev.timestamp) > new Date(existing.timestamp)) {
          evalByItem.set(ev.watchlist_item_id, ev as unknown as WatchlistEvaluation);
        }
      }

      return items.map((item: Record<string, unknown>) => ({
        ...item,
        latest_evaluation: evalByItem.get(item.id as string) || null,
      })) as unknown as WatchlistItem[];
    } catch (err) {
      console.warn('Supabase getWatchlist error, falling back to local store:', err);
    }
  }

  const store = ensureDataFile();
  return store.items.map((item) => {
    const latest = store.evaluations
      .filter((e) => e.watchlist_item_id === item.id || e.ticker === item.ticker)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { ...item, latest_evaluation: latest[0] || null };
  });
}

export async function addWatchlistItem(
  ticker: string,
  options?: { price?: number; score?: number; direction?: 'bullish' | 'bearish' }
): Promise<{ item: WatchlistItem; evaluation: WatchlistEvaluation }> {
  let price = options?.price;
  const score = options?.score ?? 3;
  let direction = options?.direction ?? 'bullish';

  if (!price || price <= 0) {
    const tvQuote = await fetchTradingViewQuote(ticker);
    if (tvQuote && tvQuote.price > 0) {
      price = tvQuote.price;
      if (!options?.direction) direction = tvQuote.changePercent >= 0 ? 'bullish' : 'bearish';
    } else {
      price = 1000;
    }
  }

  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      const { data: existingActive } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('ticker', ticker)
        .eq('status', 'active')
        .maybeSingle();

      if (existingActive) throw new Error('Stock already active in watchlist');

      const { data: existingStopped } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('ticker', ticker)
        .eq('status', 'stopped')
        .maybeSingle();

      let targetItem: Record<string, unknown>;

      if (existingStopped) {
        const { data: updated, error } = await supabase
          .from('watchlist_items')
          .update({ status: 'active', stopped_at: null, marked_at: nowIso })
          .eq('id', existingStopped.id)
          .select()
          .single();
        if (error) throw error;
        targetItem = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('watchlist_items')
          .insert({ ticker, status: 'active', marked_at: nowIso })
          .select()
          .single();
        if (error) throw error;
        targetItem = inserted;
      }

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

      await supabase.from('watchlist_evaluations').insert({
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

      return { item: { ...targetItem, latest_evaluation: initialEval } as unknown as WatchlistItem, evaluation: initialEval };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Stock already active in watchlist') throw err;
      console.warn('Supabase add error, continuing with local store:', err);
    }
  }

  const store = ensureDataFile();
  const existingActiveIdx = store.items.findIndex((i) => i.ticker === ticker && i.status === 'active');
  if (existingActiveIdx >= 0) throw new Error('Stock already active in watchlist');

  const existingStoppedIdx = store.items.findIndex((i) => i.ticker === ticker && i.status === 'stopped');
  let item: WatchlistItem;

  if (existingStoppedIdx >= 0) {
    store.items[existingStoppedIdx] = {
      ...store.items[existingStoppedIdx],
      status: 'active',
      stopped_at: null,
      marked_at: nowIso,
      entry_price: price,
      entry_score: score,
      entry_direction: direction,
    };
    item = store.items[existingStoppedIdx];
  } else {
    item = {
      id: crypto.randomUUID(),
      ticker,
      status: 'active',
      marked_at: nowIso,
      stopped_at: null,
      entry_price: price,
      entry_score: score,
      entry_direction: direction,
    };
    store.items.unshift(item);
  }

  const initialEval: WatchlistEvaluation = {
    id: crypto.randomUUID(),
    watchlist_item_id: item.id,
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

  store.evaluations.unshift(initialEval);
  saveLocalStore(store);
  return { item: { ...item, latest_evaluation: initialEval }, evaluation: initialEval };
}

export async function stopWatchlistItem(ticker: string): Promise<boolean> {
  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('watchlist_items')
        .update({ status: 'stopped', stopped_at: nowIso })
        .eq('ticker', ticker)
        .eq('status', 'active');
      if (!error) return true;
    } catch (err) {
      console.warn('Supabase stop error, falling back to local store:', err);
    }
  }

  const store = ensureDataFile();
  const index = store.items.findIndex((i) => i.ticker === ticker && i.status === 'active');
  if (index >= 0) {
    store.items[index].status = 'stopped';
    store.items[index].stopped_at = nowIso;
    saveLocalStore(store);
    return true;
  }
  return false;
}

/**
 * Evaluates active watchlist items against real-time live prices.
 * Uses TradingView batch fetching for instant evaluation.
 */
export async function evaluateWatchlist(filterTicker?: string): Promise<{
  items: WatchlistItem[];
  summary: { total: number; benar: number; floating: number; meleset: number; hitRate: number };
}> {
  const currentItems = await getWatchlistItems();
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
        (tvQuote?.changePercent || 0) >= 0 ? 'bullish' : 'bearish';

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
        try {
          await supabase.from('watchlist_evaluations').insert({
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
        } catch {
          // Ignore individual insert failures
        }
      }
    } catch (err) {
      console.error(`Error evaluating ${item.ticker}:`, err);
    }
  }

  const store = ensureDataFile();
  for (const ev of updatedEvals) {
    store.evaluations.unshift(ev);
  }
  saveLocalStore(store);

  const refreshedItems = await getWatchlistItems();
  const total = refreshedItems.length;
  const benar = refreshedItems.filter((i) => i.latest_evaluation?.status === 'benar').length;
  const floating = refreshedItems.filter((i) => i.latest_evaluation?.status === 'floating').length;
  const meleset = refreshedItems.filter((i) => i.latest_evaluation?.status === 'meleset').length;
  const hitRate = total > 0 ? (benar / total) * 100 : 0;

  if (supabase) {
    try {
      await supabase.from('accuracy_stats').upsert(
        {
          indicator: 'Overall System',
          combination: 'TradingView Real-Time Feed',
          score_range: '1-5',
          total_evaluations: total,
          correct_count: benar,
          floating_count: floating,
          missed_count: meleset,
          hit_rate: Math.round(hitRate * 100) / 100,
          updated_at: nowIso,
        },
        { onConflict: 'indicator' }
      );
    } catch {
      // Ignore
    }
  }

  return {
    items: refreshedItems,
    summary: { total, benar, floating, meleset, hitRate },
  };
}
