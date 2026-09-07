import { NextResponse } from 'next/server';
import { fetchAllStocksScreening, ScoreConfig } from '@/lib/stocks/fetcher';
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
    const results = await fetchAllStocksScreening(config);
    
    return NextResponse.json({
      success: true,
      data: results,
      config_version: config.rsi_period + '-' + config.macd_fast,
      timestamp: new Date().toISOString(),
      count: results.length,
    });
  } catch (error) {
    console.error('Error in screening API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch screening data' },
      { status: 500 }
    );
  }
}
