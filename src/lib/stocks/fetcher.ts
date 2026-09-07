import { getAllIDXStocks, toYahooTicker } from './idx-tickers';
import {
  calculateRSI,
  calculateMACD,
  calculateROC,
  calculateATR,
  calculateRVOL,
  calculateOBV,
  calculateScore,
} from './indicators';
import { fetchPriceFromTradingView, fetchMultiplePricesFromTradingView, TradingViewQuote } from './tradingview';

export interface ScoreConfig {
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
  macd_fast: number;
  macd_slow: number;
  macd_signal: number;
  roc_period: number;
  atr_period: number;
  atr_min_percent: number;
  atr_max_percent: number;
  volume_min_turnover: number;
  rvol_threshold: number;
  weight_momentum: number;
  weight_volume: number;
}

const DEFAULT_CONFIG: ScoreConfig = {
  rsi_period: 14,
  rsi_oversold: 30,
  rsi_overbought: 70,
  macd_fast: 12,
  macd_slow: 26,
  macd_signal: 9,
  roc_period: 12,
  atr_period: 14,
  atr_min_percent: 1.5,
  atr_max_percent: 6.0,
  volume_min_turnover: 1000000000,
  rvol_threshold: 2.0,
  weight_momentum: 50,
  weight_volume: 50,
};

interface YahooQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap: number;
}

interface YahooHistory {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeSpikeResult {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  currentVolume: number;
  yesterdayVolume: number;
  avgVolume3d: number;
  avgVolume5d: number;
  spikeVsYesterday: number;
  spikeVs3dAvg: number;
  spikeVs5dAvg: number;
}

export interface QuoteResult {
  quote: YahooQuote | null;
  dataSource: 'tradingview' | 'yahoo';
}

export async function fetchQuote(ticker: string): Promise<QuoteResult> {
  // Try TradingView MCP first
  try {
    const tvQuote = await fetchPriceFromTradingView(ticker);
    
    if (tvQuote && tvQuote.price > 0) {
      const quote: YahooQuote = {
        symbol: ticker,
        price: tvQuote.price,
        change: tvQuote.change,
        changePercent: tvQuote.change_pct,
        volume: 0, // TradingView yahoo_price doesn't provide volume
        avgVolume: 0,
        high: tvQuote['52w_high'] || tvQuote.price,
        low: tvQuote['52w_low'] || tvQuote.price,
        open: tvQuote.previous_close || tvQuote.price,
        previousClose: tvQuote.previous_close,
        marketCap: 0,
      };
      return { quote, dataSource: 'tradingview' };
    }
  } catch (error) {
    console.warn(`TradingView MCP failed for ${ticker}, falling back to Yahoo:`, error);
  }

  // Fallback to Yahoo Finance
  try {
    const yahooTicker = toYahooTicker(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) return { quote: null, dataSource: 'yahoo' };
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) return { quote: null, dataSource: 'yahoo' };
    
    const meta = result.meta;
    const quote: YahooQuote = {
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
    
    return { quote, dataSource: 'yahoo' };
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return { quote: null, dataSource: 'yahoo' };
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
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
  } catch (error) {
    console.error(`Error fetching history for ${ticker}:`, error);
    return [];
  }
}

export async function fetchAllStocksScreening(config: ScoreConfig = DEFAULT_CONFIG) {
  const results = [];
  const IDX_STOCKS = await getAllIDXStocks();
  
  // Step 1: Try to fetch all prices from TradingView MCP in batches
  console.log(`Fetching prices for ${IDX_STOCKS.length} stocks from TradingView MCP...`);
  const tvTickers = IDX_STOCKS.map(s => s.ticker);
  const tvPrices = await fetchMultiplePricesFromTradingView(tvTickers);
  console.log(`TradingView MCP returned ${tvPrices.size} prices`);
  
  // Step 2: Process each stock
  const batchSize = 5;
  let tradingViewCount = 0;
  let yahooCount = 0;
  
  for (let i = 0; i < IDX_STOCKS.length; i += batchSize) {
    const batch = IDX_STOCKS.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (stock) => {
        try {
          // Get price from TradingView or fallback to Yahoo
          let quote: YahooQuote | null = null;
          let dataSource: 'tradingview' | 'yahoo' = 'yahoo';
          
          const tvQuote = tvPrices.get(stock.ticker);
          if (tvQuote && tvQuote.price > 0) {
            // Use TradingView price (but we still need history from Yahoo for indicators)
            quote = {
              symbol: stock.ticker,
              price: tvQuote.price,
              change: tvQuote.change,
              changePercent: tvQuote.change_pct,
              volume: 0, // Will get from history
              avgVolume: 0,
              high: tvQuote['52w_high'] || tvQuote.price,
              low: tvQuote['52w_low'] || tvQuote.price,
              open: tvQuote.previous_close || tvQuote.price,
              previousClose: tvQuote.previous_close,
              marketCap: 0,
            };
            dataSource = 'tradingview';
            tradingViewCount++;
          } else {
            // Fallback to Yahoo Finance
            const result = await fetchQuote(stock.ticker);
            quote = result.quote;
            dataSource = result.dataSource;
            yahooCount++;
          }
          
          // Get history for indicators (always from Yahoo)
          const history = await fetchHistory(stock.ticker, '3mo', '1d');
          
          if (!quote || history.length === 0) return null;
          
          // Update volume from history if we got price from TradingView
          if (dataSource === 'tradingview' && history.length > 0) {
            const latestBar = history[history.length - 1];
            quote.volume = latestBar.volume;
            // Calculate avg volume from history
            const volumes = history.map(h => h.volume);
            quote.avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          }
          
          const closes = history.map(h => h.close);
          const highs = history.map(h => h.high);
          const lows = history.map(h => h.low);
          const volumes = history.map(h => h.volume);
          
          // Use config for indicator periods
          const rsi = calculateRSI(closes, config.rsi_period);
          const macdResult = calculateMACD(closes, config.macd_fast, config.macd_slow, config.macd_signal);
          const roc = calculateROC(closes, config.roc_period);
          const atr = calculateATR(highs, lows, closes, config.atr_period);
          const atrPercent = quote.price > 0 ? (atr / quote.price) * 100 : 0;
          const rvol = calculateRVOL(quote.volume, quote.avgVolume);
          const obv = calculateOBV(closes, volumes);
          
          const indicators = {
            rsi,
            macd: macdResult.macd,
            macdSignal: macdResult.signal,
            roc,
            rvol,
            atrPercent,
          };
          
          const { score, direction } = calculateScore(indicators, config);
          
          // Apply config-based filters
          const turnover = quote.volume * quote.price;
          if (turnover < config.volume_min_turnover) return null;
          if (atrPercent < config.atr_min_percent * 0.5 || atrPercent > config.atr_max_percent * 2) return null;
          
          const recentPrices = closes.slice(-5);
          const maxPrice = Math.max(...recentPrices);
          const minPrice = Math.min(...recentPrices);
          
          const maxProfitPercent = ((maxPrice - quote.price) / quote.price) * 100;
          const maxProfitNominal = maxPrice - quote.price;
          const maxLossPercent = ((minPrice - quote.price) / quote.price) * 100;
          const maxLossNominal = minPrice - quote.price;
          
          const recentVolumes = volumes.slice(-6);
          const currentVol = recentVolumes[recentVolumes.length - 1] || 0;
          const yesterdayVol = recentVolumes[recentVolumes.length - 2] || currentVol;
          const avg3d = recentVolumes.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, recentVolumes.length);
          const avg5d = recentVolumes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, recentVolumes.length);
          
          return {
            ticker: stock.ticker,
            name: stock.name,
            sector: stock.sector,
            price: quote.price,
            price_change_percent: quote.changePercent,
            volume: quote.volume,
            turnover: quote.volume * quote.price,
            score,
            direction,
            rsi,
            macd: macdResult.macd,
            macd_signal: macdResult.signal,
            roc,
            rvol,
            obv,
            atr_percent: atrPercent,
            turnover_avg: quote.avgVolume * quote.price,
            max_profit_percent: maxProfitPercent,
            max_profit_nominal: maxProfitNominal,
            max_loss_percent: maxLossPercent,
            max_loss_nominal: maxLossNominal,
            dataSource,
            volume_spike: {
              yesterday: yesterdayVol > 0 ? Math.round(((currentVol - yesterdayVol) / yesterdayVol) * 100) : 0,
              avg_3d: avg3d > 0 ? Math.round(((currentVol - avg3d) / avg3d) * 100) : 0,
              avg_5d: avg5d > 0 ? Math.round(((currentVol - avg5d) / avg5d) * 100) : 0,
            },
          };
        } catch (error) {
          console.error(`Error processing ${stock.ticker}:`, error);
          return null;
        }
      })
    );
    
    results.push(...batchResults.filter(Boolean));
    
    if (i + batchSize < IDX_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Screening complete: ${tradingViewCount} from TradingView, ${yahooCount} from Yahoo`);
  return results;
}
