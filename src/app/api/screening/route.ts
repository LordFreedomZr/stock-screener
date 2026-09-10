import { NextRequest, NextResponse } from 'next/server';
import { fetchTradingViewScreening, ScoreConfig, DEFAULT_SCORE_CONFIG } from '@/lib/stocks/tradingview-fetcher';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase =
  supabaseUrl && !supabaseUrl.includes('placeholder')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

async function fetchLatestConfig(): Promise<ScoreConfig> {
  if (!supabase) return DEFAULT_SCORE_CONFIG;
  try {
    const { data } = await supabase
      .from('threshold_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return DEFAULT_SCORE_CONFIG;

    return {
      rsi_oversold: data.rsi_oversold ?? DEFAULT_SCORE_CONFIG.rsi_oversold,
      rsi_overbought: data.rsi_overbought ?? DEFAULT_SCORE_CONFIG.rsi_overbought,
      atr_min_percent: data.atr_min_percent ?? DEFAULT_SCORE_CONFIG.atr_min_percent,
      atr_max_percent: data.atr_max_percent ?? DEFAULT_SCORE_CONFIG.atr_max_percent,
      volume_min_turnover: data.volume_min_turnover ?? DEFAULT_SCORE_CONFIG.volume_min_turnover,
      rvol_threshold: data.rvol_threshold ?? DEFAULT_SCORE_CONFIG.rvol_threshold,
      weight_momentum: data.weight_momentum ?? DEFAULT_SCORE_CONFIG.weight_momentum,
      weight_volume: data.weight_volume ?? DEFAULT_SCORE_CONFIG.weight_volume,
    };
  } catch {
    return DEFAULT_SCORE_CONFIG;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const config = await fetchLatestConfig();
    
    // Get enabled indicators from query params
    const { searchParams } = new URL(request.url);
    const enabledParam = searchParams.get('enabled');
    let enabledIndicators = ['rsi', 'macd', 'roc', 'rvol', 'atr']; // default: all enabled
    if (enabledParam) {
      enabledIndicators = enabledParam.split(',').filter(Boolean);
    }

    const limit = parseInt(searchParams.get('limit') || '150');
    const results = await fetchTradingViewScreening(config, limit, enabledIndicators);

    return NextResponse.json({
      success: true,
      data: results,
      config_version: `${config.rsi_oversold}-${config.rsi_overbought}`,
      timestamp: new Date().toISOString(),
      count: results.length,
      dataSource: 'tradingview',
      response_time_ms: Date.now() - startTime,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch screening data';
    console.error('Error in screening API:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
