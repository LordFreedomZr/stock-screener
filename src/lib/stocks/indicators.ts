// Technical indicator calculations
// All functions work with arrays of closing prices

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  if (losses === 0) return 100;
  
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calculate EMA series (returns array of EMA values)
function calculateEMASeries(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  
  const multiplier = 2 / (period + 1);
  const emaSeries: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    const ema = (prices[i] - emaSeries[i - 1]) * multiplier + emaSeries[i - 1];
    emaSeries.push(ema);
  }
  
  return emaSeries;
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  // MACD line = EMA(12) - EMA(26)
  const fastEMA = calculateEMASeries(prices, fastPeriod);
  const slowEMA = calculateEMASeries(prices, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }
  
  // Signal line = EMA(9) of MACD line
  const signalLine = calculateEMASeries(macdLine, signalPeriod);
  
  const lastIdx = prices.length - 1;
  const macd = macdLine[lastIdx];
  const signal = signalLine[lastIdx];
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

export function calculateROC(prices: number[], period: number = 12): number {
  if (prices.length <= period) return 0;
  
  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - period];
  
  if (pastPrice === 0) return 0;
  
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-period);
  const atr = recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
  
  return atr;
}

export function calculateRVOL(currentVolume: number, avgVolume: number): number {
  if (avgVolume === 0) return 1;
  return currentVolume / avgVolume;
}

export function calculateOBV(closes: number[], volumes: number[]): number {
  if (closes.length < 2) return 0;
  
  let obv = 0;
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
  }
  
  return obv;
}

// Weighted scoring system
// Each indicator has a weight (configurable) and returns a signal score
interface IndicatorSignal {
  score: number; // 0-1 normalized
  weight: number;
  label: string;
}

interface ScoreConfig {
  rsi_oversold: number;
  rsi_overbought: number;
  atr_min_percent: number;
  atr_max_percent: number;
  rvol_threshold: number;
  weight_momentum: number;
  weight_volume: number;
}

export function calculateScore(
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    roc: number;
    rvol: number;
    atrPercent: number;
  },
  config: ScoreConfig = {
    rsi_oversold: 30,
    rsi_overbought: 70,
    atr_min_percent: 1.5,
    atr_max_percent: 6.0,
    rvol_threshold: 2.0,
    weight_momentum: 50,
    weight_volume: 50,
  }
): { score: number; direction: 'bullish' | 'bearish'; breakdown: IndicatorSignal[] } {
  
  // RSI signal (0-1) using config thresholds
  const midRsi = (config.rsi_overbought + config.rsi_oversold) / 2;
  let rsiScore = 0;
  if (indicators.rsi > midRsi && indicators.rsi < config.rsi_overbought) rsiScore = 1;
  else if (indicators.rsi >= config.rsi_oversold && indicators.rsi <= midRsi) rsiScore = 0.5;
  else if (indicators.rsi < config.rsi_oversold) rsiScore = 0.7; // oversold = potential bounce
  else rsiScore = 0.1; // overbought

  // MACD signal (0-1)
  let macdScore = 0;
  const macdBullish = indicators.macd > indicators.macdSignal;
  const histogramStrength = Math.abs(indicators.macd - indicators.macdSignal);
  if (macdBullish) {
    macdScore = Math.min(1, 0.5 + histogramStrength * 10);
  } else {
    macdScore = Math.max(0, 0.5 - histogramStrength * 10);
  }

  // ROC signal (0-1)
  let rocScore = 0;
  if (indicators.roc > 3) rocScore = 1;
  else if (indicators.roc > 0) rocScore = 0.7;
  else if (indicators.roc > -3) rocScore = 0.3;
  else rocScore = 0;

  // RVOL signal (0-1) using config threshold
  const t = config.rvol_threshold;
  let rvolScore = 0;
  if (indicators.rvol >= t) rvolScore = 1;
  else if (indicators.rvol >= t * 0.75) rvolScore = 0.8;
  else if (indicators.rvol >= 1) rvolScore = 0.5;
  else rvolScore = 0.2;

  // ATR signal (0-1) using config min/max
  let atrScore = 0;
  if (indicators.atrPercent >= config.atr_min_percent && indicators.atrPercent <= config.atr_max_percent) atrScore = 1;
  else if (indicators.atrPercent >= config.atr_min_percent * 0.7 && indicators.atrPercent <= config.atr_max_percent * 1.3) atrScore = 0.6;
  else atrScore = 0.2;

  // Weights from config (momentum vs volume split)
  const momentumWeight = config.weight_momentum / 100;
  const volumeWeight = config.weight_volume / 100;
  
  // Momentum indicators: RSI, MACD, ROC (share momentumWeight)
  const rsiW = momentumWeight * 0.4;   // 40% of momentum
  const macdW = momentumWeight * 0.35; // 35% of momentum
  const rocW = momentumWeight * 0.25;  // 25% of momentum
  
  // Volume indicators: RVOL, ATR (share volumeWeight)
  const rvolW = volumeWeight * 0.6; // 60% of volume
  const atrW = volumeWeight * 0.4;  // 40% of volume

  const signals: IndicatorSignal[] = [
    { score: rsiScore, weight: rsiW, label: 'RSI' },
    { score: macdScore, weight: macdW, label: 'MACD' },
    { score: rocScore, weight: rocW, label: 'ROC' },
    { score: rvolScore, weight: rvolW, label: 'RVOL' },
    { score: atrScore, weight: atrW, label: 'ATR' },
  ];

  // Calculate weighted score (0-5 scale)
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const normalizedScore = totalWeight > 0
    ? signals.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight
    : 0.5;
  const finalScore = Math.round(normalizedScore * 5 * 10) / 10;

  // Direction based on momentum indicators only (more responsive)
  const bullishPower = rsiScore * rsiW + macdScore * macdW + rocScore * rocW;
  const bearishPower = (1 - rsiScore) * rsiW + (1 - macdScore) * macdW + (1 - rocScore) * rocW;
  const direction = bullishPower > bearishPower ? 'bullish' : 'bearish';

  return { score: Math.min(5, Math.max(1, finalScore)), direction, breakdown: signals };
}
