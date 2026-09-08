// Yahoo Finance - only used for historical chart data and watchlist quote fallback
// Screening is done entirely via TradingView Scanner API

import { toYahooTicker } from './idx-tickers';

interface YahooHistory {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchQuote(ticker: string) {
  try {
    const yahooTicker = toYahooTicker(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    return {
      symbol: ticker,
      price: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      changePercent: meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0,
      volume: meta.regularMarketVolume || 0,
      avgVolume: meta.averageDailyVolume3Month || 0,
      high: meta.regularMarketDayHigh || meta.regularMarketPrice || 0,
      low: meta.regularMarketDayLow || meta.regularMarketPrice || 0,
      open: meta.regularMarketOpen || meta.regularMarketPrice || 0,
      previousClose: meta.chartPreviousClose || 0,
      marketCap: meta.marketCap || 0,
    };
  } catch {
    return null;
  }
}

export async function fetchHistory(
  ticker: string,
  range: string = '3mo',
  interval: string = '1d'
): Promise<YahooHistory[]> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=${interval}&range=${range}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const ohlc = result.indicators?.quote?.[0] || {};
    const history: YahooHistory[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (ohlc.open[i] !== null && ohlc.close[i] !== null) {
        history.push({
          timestamp: timestamps[i],
          open: ohlc.open[i],
          high: ohlc.high[i],
          low: ohlc.low[i],
          close: ohlc.close[i],
          volume: ohlc.volume[i] || 0,
        });
      }
    }

    return history;
  } catch {
    return [];
  }
}
