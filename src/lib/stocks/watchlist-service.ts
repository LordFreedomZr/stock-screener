import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fetchQuote } from './fetcher';
import { WatchlistItem, WatchlistEvaluation } from '@/types';

// Supabase client initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local JSON file storage path (fallback when Supabase is offline/not configured)
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'watchlist_store.json');

interface LocalStore {
  items: WatchlistItem[];
  evaluations: WatchlistEvaluation[];
}

function ensureDataFile(): LocalStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: LocalStore = { items: [], evaluations: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as LocalStore;
  } catch (error) {
    console.error('Error reading local watchlist store:', error);
    return { items: [], evaluations: [] };
  }
}

function saveLocalStore(store: LocalStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving local watchlist store:', error);
  }
}

/**
 * Evaluates whether movement conforms to predicted direction.
 * Threshold: within ±2% is considered 'floating'.
 * If bullish and > +2% -> 'benar'
 * If bullish and < -2% -> 'meleset'
 * If bearish and < -2% -> 'benar'
 * If bearish and > +2% -> 'meleset'
 */
export function determineEvaluationStatus(
  direction: 'bullish' | 'bearish',
  priceMovementPercent: number
): 'benar' | 'floating' | 'meleset' {
  if (priceMovementPercent >= -2 && priceMovementPercent <= 2) {
    return 'floating';
  }

  if (direction === 'bullish') {
    return priceMovementPercent > 2 ? 'benar' : 'meleset';
  } else {
    return priceMovementPercent < -2 ? 'benar' : 'meleset';
  }
}

/**
 * Get all watchlist items with their latest evaluation.
 */
export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('watchlist_items')
        .select('*')
        .order('marked_at', { ascending: false });

      if (!error && data) {
        const itemsWithEvaluation = await Promise.all(
          data.map(async (item: any) => {
            const { data: evalData } = await supabase
              .from('watchlist_evaluations')
              .select('*')
              .eq('watchlist_item_id', item.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...item,
              latest_evaluation: evalData || null,
            };
          })
        );
        return itemsWithEvaluation;
      }
    } catch (err) {
      console.warn('Supabase getWatchlist error, falling back to local store:', err);
    }
  }

  // Fallback to local store
  const store = ensureDataFile();
  return store.items.map((item) => {
    const itemEvals = store.evaluations
      .filter((e) => e.watchlist_item_id === item.id || e.ticker === item.ticker)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      ...item,
      latest_evaluation: itemEvals[0] || null,
    };
  });
}

/**
 * Add a stock to watchlist with entry price, score, and direction baseline.
 */
export async function addWatchlistItem(
  ticker: string,
  options?: {
    price?: number;
    score?: number;
    direction?: 'bullish' | 'bearish';
  }
): Promise<{ item: WatchlistItem; evaluation: WatchlistEvaluation }> {
  // Fetch quote if not provided
  let price = options?.price;
  let score = options?.score ?? 3;
  let direction = options?.direction ?? 'bullish';

  if (!price || price <= 0) {
    const quote = await fetchQuote(ticker);
    if (quote && quote.price > 0) {
      price = quote.price;
      if (!options?.direction) {
        direction = quote.changePercent >= 0 ? 'bullish' : 'bearish';
      }
    } else {
      price = 1000; // sensible fallback
    }
  }

  const nowIso = new Date().toISOString();

  // Try Supabase first
  if (supabase) {
    try {
      // Check existing
      const { data: existingActive } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('ticker', ticker)
        .eq('status', 'active')
        .maybeSingle();

      if (existingActive) {
        throw new Error('Stock already active in watchlist');
      }

      const { data: existingStopped } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('ticker', ticker)
        .eq('status', 'stopped')
        .maybeSingle();

      let targetItem: any;

      if (existingStopped) {
        const { data: updated, error: updateErr } = await supabase
          .from('watchlist_items')
          .update({
            status: 'active',
            stopped_at: null,
            marked_at: nowIso,
          })
          .eq('id', existingStopped.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        targetItem = updated;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('watchlist_items')
          .insert({
            ticker,
            status: 'active',
            marked_at: nowIso,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        targetItem = inserted;
      }

      // Create initial baseline evaluation
      const initialEval: WatchlistEvaluation = {
        id: crypto.randomUUID(),
        watchlist_item_id: targetItem.id,
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

      return {
        item: { ...targetItem, latest_evaluation: initialEval },
        evaluation: initialEval,
      };
    } catch (err: any) {
      if (err.message === 'Stock already active in watchlist') {
        throw err;
      }
      console.warn('Supabase add error, continuing with local store:', err);
    }
  }

  // Local fallback
  const store = ensureDataFile();
  const existingActiveIdx = store.items.findIndex(
    (i) => i.ticker === ticker && i.status === 'active'
  );

  if (existingActiveIdx >= 0) {
    throw new Error('Stock already active in watchlist');
  }

  const existingStoppedIdx = store.items.findIndex(
    (i) => i.ticker === ticker && i.status === 'stopped'
  );

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

/**
 * Stop watching an item.
 */
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
 */
export async function evaluateWatchlist(filterTicker?: string): Promise<{
  items: WatchlistItem[];
  summary: {
    total: number;
    benar: number;
    floating: number;
    meleset: number;
    hitRate: number;
  };
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

  for (const item of activeItems) {
    try {
      const quote = await fetchQuote(item.ticker);
      if (!quote || quote.price <= 0) {
        continue;
      }

      const currentPrice = quote.price;

      // Determine baseline entry price and direction
      const previousEval = item.latest_evaluation;
      const entryPrice =
        item.entry_price ||
        previousEval?.entry_price ||
        previousEval?.current_price ||
        quote.previousClose ||
        currentPrice;

      const direction: 'bullish' | 'bearish' =
        item.entry_direction ||
        previousEval?.analysis_direction ||
        (quote.changePercent >= 0 ? 'bullish' : 'bearish');

      const score = item.entry_score || previousEval?.analysis_score || 3;

      // Calculate movements
      const priceMovementNominal = currentPrice - entryPrice;
      const priceMovementPercent =
        entryPrice > 0 ? (priceMovementNominal / entryPrice) * 100 : 0;

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

      // Save to Supabase if configured
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
        } catch (dbErr) {
          console.warn('Failed to insert evaluation into Supabase:', dbErr);
        }
      }
    } catch (err) {
      console.error(`Error evaluating ${item.ticker}:`, err);
    }
  }

  // Also update local store
  const store = ensureDataFile();
  for (const evalItem of updatedEvals) {
    store.evaluations.unshift(evalItem);
  }
  saveLocalStore(store);

  // Re-fetch all items with fresh evaluations
  const refreshedItems = await getWatchlistItems();

  const total = refreshedItems.length;
  const benar = refreshedItems.filter((i) => i.latest_evaluation?.status === 'benar').length;
  const floating = refreshedItems.filter((i) => i.latest_evaluation?.status === 'floating').length;
  const meleset = refreshedItems.filter((i) => i.latest_evaluation?.status === 'meleset').length;
  const hitRate = total > 0 ? (benar / total) * 100 : 0;

  // Update accuracy_stats in Supabase if possible
  if (supabase) {
    try {
      await supabase.from('accuracy_stats').upsert(
        {
          indicator: 'Overall System',
          combination: 'Momentum + Volume Composite',
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
    } catch (err) {
      // Ignore conflict error
    }
  }

  return {
    items: refreshedItems,
    summary: {
      total,
      benar,
      floating,
      meleset,
      hitRate,
    },
  };
}
