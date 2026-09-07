import { NextResponse } from 'next/server';
import { fetchAllStocksScreening, ScoreConfig } from '@/lib/stocks/fetcher';
import { getAllIDXStocks } from '@/lib/stocks/idx-tickers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const defaultScoreConfig: ScoreConfig = {
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

async function fetchLatestConfig(): Promise<ScoreConfig> {
  try {
    const { data } = await supabase
      .from('threshold_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return defaultScoreConfig;

    return {
      rsi_period: data.rsi_period ?? defaultScoreConfig.rsi_period,
      rsi_oversold: data.rsi_oversold ?? defaultScoreConfig.rsi_oversold,
      rsi_overbought: data.rsi_overbought ?? defaultScoreConfig.rsi_overbought,
      macd_fast: data.macd_fast ?? defaultScoreConfig.macd_fast,
      macd_slow: data.macd_slow ?? defaultScoreConfig.macd_slow,
      macd_signal: data.macd_signal ?? defaultScoreConfig.macd_signal,
      roc_period: data.roc_period ?? defaultScoreConfig.roc_period,
      atr_period: data.atr_period ?? defaultScoreConfig.atr_period,
      atr_min_percent: data.atr_min_percent ?? defaultScoreConfig.atr_min_percent,
      atr_max_percent: data.atr_max_percent ?? defaultScoreConfig.atr_max_percent,
      volume_min_turnover: data.volume_min_turnover ?? defaultScoreConfig.volume_min_turnover,
      rvol_threshold: data.rvol_threshold ?? defaultScoreConfig.rvol_threshold,
      weight_momentum: data.weight_momentum ?? defaultScoreConfig.weight_momentum,
      weight_volume: data.weight_volume ?? defaultScoreConfig.weight_volume,
    };
  } catch {
    return defaultScoreConfig;
  }
}

export async function GET() {
  try {
    const config = await fetchLatestConfig();
    const allStocks = await getAllIDXStocks();
    const results = await fetchAllStocksScreening(config);
    
    // Filter out null values and ensure proper typing
    const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
    
    // Calculate data source stats
    const tradingViewCount = validResults.filter(r => r.dataSource === 'tradingview').length;
    const yahooCount = validResults.filter(r => r.dataSource === 'yahoo').length;
    const primarySource = tradingViewCount >= yahooCount ? 'tradingview' : 'yahoo';
    
    return NextResponse.json({
      success: true,
      data: validResults,
      config_version: config.rsi_period + '-' + config.macd_fast,
      timestamp: new Date().toISOString(),
      count: validResults.length,
      total_available: allStocks.length,
      dataSource: {
        primary: primarySource,
        tradingview: tradingViewCount,
        yahoo: yahooCount,
      },
    });
  } catch (error) {
    console.error('Error in screening API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch screening data' },
      { status: 500 }
    );
  }
}
