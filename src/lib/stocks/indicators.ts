// Technical indicator calculations
// All functions work with arrays of closing prices

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // default neutral
  
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

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  
  // Simplified: use last value as signal
  const signal = macdLine * 0.8; // simplified
  
  return {
    macd: macdLine,
    signal: signal,
    histogram: macdLine - signal,
  };
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
  
  // Calculate ATR as simple average of true ranges
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

// Calculate score based on indicators (1-5)
export function calculateScore(indicators: {
  rsi: number;
  macd: number;
  macdSignal: number;
  roc: number;
  rvol: number;
  atrPercent: number;
}): { score: number; direction: 'bullish' | 'bearish' } {
  let score = 0;
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI
  if (indicators.rsi > 50) bullishSignals++;
  else bearishSignals++;
  
  if (indicators.rsi > 30 && indicators.rsi < 70) score += 1;
  
  // MACD
  if (indicators.macd > indicators.macdSignal) {
    bullishSignals++;
    score += 1;
  } else {
    bearishSignals++;
  }
  
  // ROC
  if (indicators.roc > 0) {
    bullishSignals++;
    score += 1;
  } else {
    bearishSignals++;
  }
  
  // RVOL (volume confirmation)
  if (indicators.rvol > 1.5) {
    score += 1; // volume confirms movement
  }
  
  // ATR (volatility check - moderate is good)
  if (indicators.atrPercent >= 1.5 && indicators.atrPercent <= 6) {
    score += 1;
  }
  
  const direction = bullishSignals > bearishSignals ? 'bullish' : 'bearish';
  
  return { score: Math.min(5, Math.max(1, score)), direction };
}
