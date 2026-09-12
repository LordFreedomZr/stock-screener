import { ScreeningResult } from '@/types';

const TRADINGVIEW_SCANNER_URL = 'https://scanner.tradingview.com/indonesia/scan';

// TradingView built-in indicator columns - no manual calculation needed
const SCAN_COLUMNS = [
  'name',                // 0: ticker
  'description',         // 1: company name
  'close',               // 2: real-time price
  'change',              // 3: change percent
  'open',                // 4: open price
  'high',                // 5: high price
  'low',                 // 6: low price
  'volume',              // 7: volume
  'Value.Traded',        // 8: turnover in IDR
  'RSI',                 // 9: RSI (14) built-in
  'MACD.macd',           // 10: MACD line built-in
  'MACD.signal',         // 11: MACD signal built-in
  'MACD.hist',           // 12: MACD histogram built-in
  'ATR',                 // 13: ATR nominal built-in
  'average_volume_10d_calc', // 14: avg volume 10 days
  'average_volume_30d_calc', // 15: avg volume 30 days
  'Perf.W',              // 16: 1 week momentum (ROC proxy)
  'sector',              // 17: sector
];

export interface TradingViewQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  turnover: number;
}

// Scoring config - only thresholds & weights (indicators come from TradingView built-in)
export interface ScoreConfig {
  rsi_oversold: number;
  rsi_overbought: number;
  atr_min_percent: number;
  atr_max_percent: number;
  volume_min_turnover: number;
  rvol_threshold: number;
  weight_momentum: number;
  weight_volume: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  atr_min_percent: 1.5,
  atr_max_percent: 6.0,
  volume_min_turnover: 500000000,
  rvol_threshold: 2.0,
  weight_momentum: 50,
  weight_volume: 50,
};

// Weighted scoring using TradingView built-in indicators
function calculateScore(
  rsi: number,
  macd: number,
  macdSignal: number,
  roc: number,
  rvol: number,
  atrPercent: number,
  config: ScoreConfig,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr']
): { score: number; direction: 'bullish' | 'bearish' } {
  const midRsi = (config.rsi_overbought + config.rsi_oversold) / 2;

  // RSI signal (0-1) - only if enabled
  let rsiScore = 0;
  if (enabledIndicators.includes('rsi')) {
    if (rsi > midRsi && rsi < config.rsi_overbought) rsiScore = 1;
    else if (rsi >= config.rsi_oversold && rsi <= midRsi) rsiScore = 0.5;
    else if (rsi < config.rsi_oversold) rsiScore = 0.7;
    else rsiScore = 0.1;
  }

  // MACD signal (0-1) - only if enabled
  let macdScore = 0;
  if (enabledIndicators.includes('macd')) {
    const macdBullish = macd > macdSignal;
    const histStrength = Math.abs(macd - macdSignal);
    macdScore = macdBullish
      ? Math.min(1, 0.5 + histStrength * 10)
      : Math.max(0, 0.5 - histStrength * 10);
  }

  // ROC signal (0-1) - only if enabled
  let rocScore = 0;
  if (enabledIndicators.includes('roc')) {
    if (roc > 3) rocScore = 1;
    else if (roc > 0) rocScore = 0.7;
    else if (roc > -3) rocScore = 0.3;
  }

  // RVOL signal (0-1) - only if enabled
  let rvolScore = 0;
  if (enabledIndicators.includes('rvol')) {
    const t = config.rvol_threshold;
    if (rvol >= t) rvolScore = 1;
    else if (rvol >= t * 0.75) rvolScore = 0.8;
    else if (rvol >= 1) rvolScore = 0.5;
    else rvolScore = 0.2;
  }

  // ATR signal (0-1) - only if enabled
  let atrScore = 0;
  if (enabledIndicators.includes('atr')) {
    if (atrPercent >= config.atr_min_percent && atrPercent <= config.atr_max_percent) atrScore = 1;
    else if (atrPercent >= config.atr_min_percent * 0.7 && atrPercent <= config.atr_max_percent * 1.3) atrScore = 0.6;
    else atrScore = 0.2;
  }

  // Weighted scores - only include weights for enabled indicators
  const mw = config.weight_momentum / 100;
  const vw = config.weight_volume / 100;
  const rsiW = enabledIndicators.includes('rsi') ? mw * 0.4 : 0;
  const macdW = enabledIndicators.includes('macd') ? mw * 0.35 : 0;
  const rocW = enabledIndicators.includes('roc') ? mw * 0.25 : 0;
  const rvolW = enabledIndicators.includes('rvol') ? vw * 0.6 : 0;
  const atrW = enabledIndicators.includes('atr') ? vw * 0.4 : 0;

  const totalW = rsiW + macdW + rocW + rvolW + atrW;
  // Prevent division by zero - if no indicators enabled, score is 3 (neutral)
  const score = totalW === 0 
    ? 3 
    : Math.min(5, Math.max(1, Math.round(((rsiScore * rsiW + macdScore * macdW + rocScore * rocW + rvolScore * rvolW + atrScore * atrW) / totalW) * 5 * 10) / 10));

  const bullish = rsiScore * rsiW + macdScore * macdW + rocScore * rocW;
  const bearish = (1 - rsiScore) * rsiW + (1 - macdScore) * macdW + (1 - rocScore) * rocW;

  return { score, direction: bullish > bearish ? 'bullish' : 'bearish' };
}

/**
 * Fetch top liquid IDX stocks using TradingView Scanner API.
 * All indicators (RSI, MACD, ATR, etc.) come from TradingView built-in - no manual calculation.
 */
export async function fetchTradingViewScreening(
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  limit: number = 150,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr']
): Promise<ScreeningResult[]> {
  const payload = {
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'typespecs', operation: 'has_none_of', right: ['preferred'] },
    ],
    sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
    range: [0, limit],
    columns: SCAN_COLUMNS,
  };

  const response = await fetch(TRADINGVIEW_SCANNER_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`TradingView Scanner HTTP ${response.status}`);
  }

  const json = await response.json();
  const rows = json.data || [];
  const results: ScreeningResult[] = [];

  for (const row of rows) {
    const d = row.d;
    if (!d || d.length < SCAN_COLUMNS.length) continue;

    const ticker = String(d[0] || '').toUpperCase();
    const name = String(d[1] || ticker);
    const close = Number(d[2]) || 0;
    const changePercent = Number(d[3]) || 0;
    const volume = Number(d[7]) || 0;
    const turnover = Number(d[8]) || 0;
    const rsi = d[9] != null ? Number(d[9]) : 50;
    const macd = Number(d[10]) ?? 0;
    const macdSignal = Number(d[11]) ?? 0;
    const atrNominal = Number(d[13]) || 0;
    const avgVol10d = Number(d[14]) || volume;
    const avgVol30d = Number(d[15]) || volume;
    const roc = Number(d[16]) ?? changePercent;
    const sector = String(d[17] || 'Unknown');

    // Skip illiquid stocks
    if (turnover < config.volume_min_turnover || close <= 0) continue;

    // Calculate derived metrics (only things TradingView doesn't provide)
    const rvol = avgVol10d > 0 ? volume / avgVol10d : 1.0;
    const atrPercent = close > 0 ? (atrNominal / close) * 100 : 2.0;

    // Score using TradingView built-in indicators
    const { score, direction } = calculateScore(rsi, macd, macdSignal, roc, rvol, atrPercent, config, enabledIndicators);

    // Volume spike
    const spikeVs10d = avgVol10d > 0 ? Math.round(((volume - avgVol10d) / avgVol10d) * 100) : 0;
    const spikeVs30d = avgVol30d > 0 ? Math.round(((volume - avgVol30d) / avgVol30d) * 100) : 0;

    // Profit/Loss targets based on ATR
    const maxProfitPercent = Math.max(1, Math.round(atrPercent * 2 * 10) / 10);
    const maxProfitNominal = Math.round(close * (maxProfitPercent / 100));
    const maxLossPercent = -Math.max(1, Math.round(atrPercent * 10) / 10);
    const maxLossNominal = Math.round(close * (maxLossPercent / 100));

    results.push({
      id: `tv-${ticker}`,
      ticker,
      name,
      sector,
      timestamp: new Date().toISOString(),
      price: close,
      price_change_percent: Math.round(changePercent * 100) / 100,
      volume,
      turnover_avg: Math.round(avgVol10d * close),
      score,
      direction,
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 100) / 100,
      macd_signal: Math.round(macdSignal * 100) / 100,
      roc: Math.round(roc * 100) / 100,
      rvol: Math.round(rvol * 100) / 100,
      obv: volume,
      atr_percent: Math.round(atrPercent * 100) / 100,
      max_profit_percent: maxProfitPercent,
      max_profit_nominal: maxProfitNominal,
      max_loss_percent: maxLossPercent,
      max_loss_nominal: maxLossNominal,
      config_version: `${config.rsi_oversold}-${config.rsi_overbought}`,
      dataSource: 'tradingview',
      volume_spike: {
        yesterday: spikeVs10d,
        avg_3d: spikeVs10d,
        avg_5d: spikeVs30d,
      },
    });
  }

  return results;
}

/**
 * Fetch a single stock by ticker from TradingView Scanner (no 150 limit).
 */
export async function fetchSingleStock(
  ticker: string,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr']
): Promise<ScreeningResult | null> {
  // Try with IDX: prefix first, then without
  for (const prefix of ['IDX:', '']) {
    const payload = {
      filter: [
        { left: 'name', operation: 'equal', right: `${prefix}${ticker.toUpperCase()}` },
        { left: 'type', operation: 'equal', right: 'stock' },
      ],
      columns: SCAN_COLUMNS,
    };

    const response = await fetch(TRADINGVIEW_SCANNER_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) continue;

    const json = await response.json();
    const rows = json.data || [];
    if (!rows.length) continue;

    const d = rows[0].d;
    if (!d || d.length < SCAN_COLUMNS.length) continue;

    const name = String(d[1] || ticker.toUpperCase());
    const close = Number(d[2]) || 0;
    const changePercent = Number(d[3]) || 0;
    const volume = Number(d[7]) || 0;
    const turnover = Number(d[8]) || 0;
    const rsi = d[9] != null ? Number(d[9]) : 50;
    const macd = Number(d[10]) ?? 0;
    const macdSignal = Number(d[11]) ?? 0;
    const atrNominal = Number(d[13]) || 0;
    const avgVol10d = Number(d[14]) || volume;
    const avgVol30d = Number(d[15]) || volume;
    const roc = Number(d[16]) ?? changePercent;
    const sector = String(d[17] || 'Unknown');

    if (close <= 0) continue;

    const rvol = avgVol10d > 0 ? volume / avgVol10d : 1.0;
    const atrPercent = close > 0 ? (atrNominal / close) * 100 : 2.0;
    const { score, direction } = calculateScore(rsi, macd, macdSignal, roc, rvol, atrPercent, config, enabledIndicators);

    const spikeVs10d = avgVol10d > 0 ? Math.round(((volume - avgVol10d) / avgVol10d) * 100) : 0;
    const spikeVs30d = avgVol30d > 0 ? Math.round(((volume - avgVol30d) / avgVol30d) * 100) : 0;
    const maxProfitPercent = Math.max(1, Math.round(atrPercent * 2 * 10) / 10);
    const maxProfitNominal = Math.round(close * (maxProfitPercent / 100));
    const maxLossPercent = -Math.max(1, Math.round(atrPercent * 10) / 10);
    const maxLossNominal = Math.round(close * (maxLossPercent / 100));

    return {
      id: `tv-${ticker.toUpperCase()}`,
      ticker: ticker.toUpperCase(),
      name,
      sector,
      timestamp: new Date().toISOString(),
      price: close,
      price_change_percent: Math.round(changePercent * 100) / 100,
      volume,
      turnover_avg: Math.round(avgVol10d * close),
      score,
      direction,
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 100) / 100,
      macd_signal: Math.round(macdSignal * 100) / 100,
      roc: Math.round(roc * 100) / 100,
      rvol: Math.round(rvol * 100) / 100,
      obv: volume,
      atr_percent: Math.round(atrPercent * 100) / 100,
      max_profit_percent: maxProfitPercent,
      max_profit_nominal: maxProfitNominal,
      max_loss_percent: maxLossPercent,
      max_loss_nominal: maxLossNominal,
      config_version: `${config.rsi_oversold}-${config.rsi_overbought}`,
      dataSource: 'tradingview',
      volume_spike: {
        yesterday: spikeVs10d,
        avg_3d: spikeVs10d,
        avg_5d: spikeVs30d,
      },
    };
  }

  return null;
}

/**
 * Fetch real-time quotes for multiple IDX tickers in a single TradingView request.
 */
export async function fetchTradingViewQuotesBatch(
  tickers: string[]
): Promise<Record<string, TradingViewQuote>> {
  if (!tickers || tickers.length === 0) return {};

  const tvSymbols = tickers.map((t) => `IDX:${t.trim().toUpperCase()}`);

  const payload = {
    symbols: { tickers: tvSymbols },
    columns: ['name', 'description', 'close', 'change', 'open', 'high', 'low', 'volume', 'Value.Traded'],
  };

  const response = await fetch(TRADINGVIEW_SCANNER_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return {};

  const json = await response.json();
  const map: Record<string, TradingViewQuote> = {};

  for (const row of json.data || []) {
    const d = row.d;
    if (!d) continue;

    const ticker = String(d[0] || '').toUpperCase();
    const close = Number(d[2]) || 0;
    const open = Number(d[4]) || close;
    const volume = Number(d[7]) || 0;

    map[ticker] = {
      ticker,
      name: String(d[1] || ticker),
      price: close,
      change: close - open,
      changePercent: Math.round((Number(d[3]) || 0) * 100) / 100,
      volume,
      open,
      high: Number(d[5]) || close,
      low: Number(d[6]) || close,
      turnover: Number(d[8]) || volume * close,
    };
  }

  return map;
}

/**
 * Fetch single real-time quote via TradingView.
 */
export async function fetchTradingViewQuote(ticker: string): Promise<TradingViewQuote | null> {
  const map = await fetchTradingViewQuotesBatch([ticker.trim().toUpperCase()]);
  return map[ticker.trim().toUpperCase()] || null;
}
