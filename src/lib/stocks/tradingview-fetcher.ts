import { ScreeningResult } from '@/types';

const TRADINGVIEW_SCANNER_URL = 'https://scanner.tradingview.com/indonesia/scan';

// In-memory cache for TradingView data (5 minute TTL)
const cache = new Map<string, { data: ScreeningResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string): ScreeningResult[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: ScreeningResult[]): void {
  // Limit cache size to prevent memory issues
  if (cache.size > 10) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

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
  // New indicators
  'BB.upper',            // 18: Bollinger Band upper
  'BB.middle',           // 19: Bollinger Band middle (SMA20)
  'BB.lower',            // 20: Bollinger Band lower
  'Stoch.K',             // 21: Stochastic %K
  'Stoch.D',             // 22: Stochastic %D
  'ADX',                 // 23: ADX
  'ADX+DI',              // 24: +DI
  'ADX-DI',              // 25: -DI
  'EMA20',               // 26: EMA 20
  'EMA50',               // 27: EMA 50
  'EMA200',              // 28: EMA 200
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
  weight_volatility: number;
  weight_sentiment: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  atr_min_percent: 1.5,
  atr_max_percent: 6.0,
  volume_min_turnover: 500000000,
  rvol_threshold: 2.0,
  weight_momentum: 40,
  weight_volume: 25,
  weight_volatility: 20,
  weight_sentiment: 15,
};

// Weighted scoring using TradingView built-in indicators
function calculateScore(
  rsi: number,
  macd: number,
  macdSignal: number,
  roc: number,
  rvol: number,
  atrPercent: number,
  bbPercent: number,
  stochK: number,
  stochD: number,
  adx: number,
  plusDI: number,
  minusDI: number,
  sentimentScore: number,
  config: ScoreConfig,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr', 'bb', 'stoch', 'adx', 'sentiment'],
  maAlignment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
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

  // Bollinger Bands signal with ADX Trend Filter
  let bbScore = 0;
  if (enabledIndicators.includes('bb')) {
    if (bbPercent <= 0.2) {
      if (adx > 25 && minusDI > plusDI) {
        bbScore = 0.2; // Strong downtrend riding lower band = continuation sell signal
      } else {
        bbScore = 0.9; // Oversold bounce signal
      }
    } else if (bbPercent >= 0.8) {
      if (adx > 25 && plusDI > minusDI) {
        bbScore = 0.8; // Strong uptrend riding upper band = momentum buy signal
      } else {
        bbScore = 0.2; // Overbought signal
      }
    } else if (bbPercent >= 0.4 && bbPercent <= 0.6) bbScore = 0.5;
    else if (bbPercent > 0.6) bbScore = 0.6;
    else bbScore = 0.4;
  }

  // Stochastic signal (0-1) - only if enabled
  let stochScore = 0;
  if (enabledIndicators.includes('stoch')) {
    const stochBullish = stochK > stochD;
    const inOversold = stochK < 20;
    const inOverbought = stochK > 80;
    
    if (inOversold && stochBullish) stochScore = 0.9;
    else if (inOverbought && !stochBullish) stochScore = 0.1;
    else if (stochBullish) stochScore = 0.7;
    else stochScore = 0.3;
  }

  // ADX signal (0-1) - only if enabled
  let adxScore = 0;
  if (enabledIndicators.includes('adx')) {
    const strongTrend = adx > 25;
    const bullishTrend = plusDI > minusDI;
    const trendStrength = Math.min(adx / 50, 1);
    
    if (strongTrend && bullishTrend) adxScore = 0.5 + trendStrength * 0.5;
    else if (strongTrend && !bullishTrend) adxScore = 0.5 - trendStrength * 0.5;
    else adxScore = 0.5;
  }

  // Sentiment signal (0-1) - only if enabled
  let sentimentScoreNorm = 0;
  if (enabledIndicators.includes('sentiment')) {
    sentimentScoreNorm = (sentimentScore + 1) / 2; // Convert -1..1 to 0..1
  }

  // Weighted scores - distribute weights based on enabled indicators
  const totalWeight = config.weight_momentum + config.weight_volume + config.weight_volatility + config.weight_sentiment;
  const momentumWeight = config.weight_momentum / totalWeight;
  const volumeWeight = config.weight_volume / totalWeight;
  const volatilityWeight = config.weight_volatility / totalWeight;
  const sentimentWeight = config.weight_sentiment / totalWeight;

  // MA Alignment modifier (+0.1 for bullish alignment, -0.1 for bearish)
  const maBonus = maAlignment === 'bullish' ? 0.1 : maAlignment === 'bearish' ? -0.1 : 0;

  // Momentum sub-indicators (RSI, MACD, ROC, Stoch)
  const momentumScore = Math.min(1, Math.max(0, (rsiScore + macdScore + rocScore + stochScore) / 4 + maBonus));

  // Volume sub-indicators (RVOL)
  const volumeScore = rvolScore;

  // Volatility sub-indicators (ATR, BB, ADX)
  const volatilityScore = (atrScore + bbScore + adxScore) / 3;

  // Final weighted score
  const rawScore = 
    momentumScore * momentumWeight +
    volumeScore * volumeWeight +
    volatilityScore * volatilityWeight +
    sentimentScoreNorm * sentimentWeight;

  const score = totalWeight === 0 
    ? 3 
    : Math.min(5, Math.max(1, Math.round(rawScore * 5 * 10) / 10));

  // Direction based on momentum + trend + MA alignment
  const bullish = (rsiScore + macdScore + rocScore + stochScore + (plusDI > minusDI ? 1 : 0) + (maAlignment === 'bullish' ? 1 : 0)) / 6;
  const bearish = ((1 - rsiScore) + (1 - macdScore) + (1 - rocScore) + (1 - stochScore) + (minusDI > plusDI ? 1 : 0) + (maAlignment === 'bearish' ? 1 : 0)) / 6;

  return { score, direction: bullish >= bearish ? 'bullish' : 'bearish' };
}

/**
 * Fetch top liquid IDX stocks using TradingView Scanner API.
 */
export async function fetchTradingViewScreening(
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  limit: number = 150,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr', 'bb', 'stoch', 'adx', 'sentiment']
): Promise<ScreeningResult[]> {
  // Check cache first
  const cacheKey = `screening-${limit}-${enabledIndicators.join(',')}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

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
    if (!d || d.length < 18) continue;

    const ticker = String(d[0] || '').toUpperCase();
    const name = String(d[1] || ticker);
    const close = Number(d[2]) || 0;
    const changePercent = Number(d[3]) || 0;
    const open = Number(d[4]) || close;
    const high = Number(d[5]) || close;
    const low = Number(d[6]) || close;
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

    // Indicators
    const bbUpper = Number(d[18]) || close;
    const bbMiddle = Number(d[19]) || close;
    const bbLower = Number(d[20]) || close;
    const stochK = d[21] != null ? Number(d[21]) : 50;
    const stochD = d[22] != null ? Number(d[22]) : 50;
    const adx = d[23] != null ? Number(d[23]) : 20;
    const plusDI = d[24] != null ? Number(d[24]) : 25;
    const minusDI = d[25] != null ? Number(d[25]) : 25;

    const ema20 = d[26] != null ? Number(d[26]) : close;
    const ema50 = d[27] != null ? Number(d[27]) : close;
    const ema200 = d[28] != null ? Number(d[28]) : close;

    // Skip illiquid stocks
    if (turnover < config.volume_min_turnover || close <= 0) continue;

    // Derived metrics
    const rvol = avgVol10d > 0 ? volume / avgVol10d : 1.0;
    const atrPercent = close > 0 ? (atrNominal / close) * 100 : 2.0;
    const bbRange = bbUpper - bbLower;
    const bbPercent = bbRange > 0 ? (close - bbLower) / bbRange : 0.5;

    // MA Alignment
    let maAlignment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (ema20 > 0 && ema50 > 0) {
      if (close >= ema20 && ema20 >= ema50) maAlignment = 'bullish';
      else if (close <= ema20 && ema20 <= ema50) maAlignment = 'bearish';
    }

    // Pivot Points (Classic)
    const pivotPoint = Math.round(((high + low + close) / 3) * 100) / 100;
    const pivotR1 = Math.round((2 * pivotPoint - low) * 100) / 100;
    const pivotS1 = Math.round((2 * pivotPoint - high) * 100) / 100;
    const pivotR2 = Math.round((pivotPoint + (high - low)) * 100) / 100;
    const pivotS2 = Math.round((pivotPoint - (high - low)) * 100) / 100;

    const sentimentScore = 0;

    const { score, direction } = calculateScore(
      rsi, macd, macdSignal, roc, rvol, atrPercent,
      bbPercent, stochK, stochD, adx, plusDI, minusDI,
      sentimentScore, config, enabledIndicators, maAlignment
    );

    const spikeVs10d = avgVol10d > 0 ? Math.round(((volume - avgVol10d) / avgVol10d) * 100) : 0;
    const spikeVs30d = avgVol30d > 0 ? Math.round(((volume - avgVol30d) / avgVol30d) * 100) : 0;

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
      bb_upper: Math.round(bbUpper * 100) / 100,
      bb_middle: Math.round(bbMiddle * 100) / 100,
      bb_lower: Math.round(bbLower * 100) / 100,
      bb_percent: Math.round(bbPercent * 100) / 100,
      stoch_k: Math.round(stochK * 10) / 10,
      stoch_d: Math.round(stochD * 10) / 10,
      adx: Math.round(adx * 10) / 10,
      plus_di: Math.round(plusDI * 10) / 10,
      minus_di: Math.round(minusDI * 10) / 10,
      ema20: Math.round(ema20 * 100) / 100,
      ema50: Math.round(ema50 * 100) / 100,
      ema200: Math.round(ema200 * 100) / 100,
      ma_alignment: maAlignment,
      pivot_point: pivotPoint,
      pivot_r1: pivotR1,
      pivot_s1: pivotS1,
      pivot_r2: pivotR2,
      pivot_s2: pivotS2,
      sentiment_score: sentimentScore,
      sentiment_label: 'neutral',
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

  setCachedData(cacheKey, results);
  return results;
}

/**
 * Fetch a single stock by ticker from TradingView Scanner (no 150 limit).
 */
export async function fetchSingleStock(
  ticker: string,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  enabledIndicators: string[] = ['rsi', 'macd', 'roc', 'rvol', 'atr', 'bb', 'stoch', 'adx', 'sentiment']
): Promise<ScreeningResult | null> {
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
    if (!d || d.length < 18) continue;

    const name = String(d[1] || ticker.toUpperCase());
    const close = Number(d[2]) || 0;
    const changePercent = Number(d[3]) || 0;
    const open = Number(d[4]) || close;
    const high = Number(d[5]) || close;
    const low = Number(d[6]) || close;
    const volume = Number(d[7]) || 0;
    const rsi = d[9] != null ? Number(d[9]) : 50;
    const macd = Number(d[10]) ?? 0;
    const macdSignal = Number(d[11]) ?? 0;
    const atrNominal = Number(d[13]) || 0;
    const avgVol10d = Number(d[14]) || volume;
    const avgVol30d = Number(d[15]) || volume;
    const roc = Number(d[16]) ?? changePercent;
    const sector = String(d[17] || 'Unknown');

    const bbUpper = Number(d[18]) || close;
    const bbMiddle = Number(d[19]) || close;
    const bbLower = Number(d[20]) || close;
    const stochK = d[21] != null ? Number(d[21]) : 50;
    const stochD = d[22] != null ? Number(d[22]) : 50;
    const adx = d[23] != null ? Number(d[23]) : 20;
    const plusDI = d[24] != null ? Number(d[24]) : 25;
    const minusDI = d[25] != null ? Number(d[25]) : 25;

    const ema20 = d[26] != null ? Number(d[26]) : close;
    const ema50 = d[27] != null ? Number(d[27]) : close;
    const ema200 = d[28] != null ? Number(d[28]) : close;

    if (close <= 0) continue;

    const rvol = avgVol10d > 0 ? volume / avgVol10d : 1.0;
    const atrPercent = close > 0 ? (atrNominal / close) * 100 : 2.0;
    const bbRange = bbUpper - bbLower;
    const bbPercent = bbRange > 0 ? (close - bbLower) / bbRange : 0.5;

    let maAlignment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (ema20 > 0 && ema50 > 0) {
      if (close >= ema20 && ema20 >= ema50) maAlignment = 'bullish';
      else if (close <= ema20 && ema20 <= ema50) maAlignment = 'bearish';
    }

    const pivotPoint = Math.round(((high + low + close) / 3) * 100) / 100;
    const pivotR1 = Math.round((2 * pivotPoint - low) * 100) / 100;
    const pivotS1 = Math.round((2 * pivotPoint - high) * 100) / 100;
    const pivotR2 = Math.round((pivotPoint + (high - low)) * 100) / 100;
    const pivotS2 = Math.round((pivotPoint - (high - low)) * 100) / 100;

    const sentimentScore = 0;

    const { score, direction } = calculateScore(
      rsi, macd, macdSignal, roc, rvol, atrPercent,
      bbPercent, stochK, stochD, adx, plusDI, minusDI,
      sentimentScore, config, enabledIndicators, maAlignment
    );

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
      bb_upper: Math.round(bbUpper * 100) / 100,
      bb_middle: Math.round(bbMiddle * 100) / 100,
      bb_lower: Math.round(bbLower * 100) / 100,
      bb_percent: Math.round(bbPercent * 100) / 100,
      stoch_k: Math.round(stochK * 10) / 10,
      stoch_d: Math.round(stochD * 10) / 10,
      adx: Math.round(adx * 10) / 10,
      plus_di: Math.round(plusDI * 10) / 10,
      minus_di: Math.round(minusDI * 10) / 10,
      ema20: Math.round(ema20 * 100) / 100,
      ema50: Math.round(ema50 * 100) / 100,
      ema200: Math.round(ema200 * 100) / 100,
      ma_alignment: maAlignment,
      pivot_point: pivotPoint,
      pivot_r1: pivotR1,
      pivot_s1: pivotS1,
      pivot_r2: pivotR2,
      pivot_s2: pivotS2,
      sentiment_score: sentimentScore,
      sentiment_label: 'neutral',
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

