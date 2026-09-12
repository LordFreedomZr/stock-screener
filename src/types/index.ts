export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  is_active: boolean;
  created_at: string;
}

export interface PriceSnapshot {
  id: string;
  ticker: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

export interface ScreeningResult {
  id: string;
  ticker: string;
  name: string;
  sector?: string;
  timestamp: string;
  score: number;
  direction: 'bullish' | 'bearish';
  rsi: number;
  macd: number;
  macd_signal: number;
  roc: number;
  rvol: number;
  obv: number;
  atr_percent: number;
  turnover_avg: number;
  price: number;
  price_change_percent: number;
  max_profit_percent: number;
  max_profit_nominal: number;
  max_loss_percent: number;
  max_loss_nominal: number;
  volume: number;
  config_version: string;
  dataSource: 'tradingview' | 'yahoo';
  volume_spike?: {
    yesterday: number;
    avg_3d: number;
    avg_5d: number;
  };
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  status: 'active' | 'stopped';
  marked_at: string;
  stopped_at: string | null;
  group_name: string;
  stock?: Stock;
  latest_evaluation?: WatchlistEvaluation;
  entry_price?: number;
  entry_score?: number;
  entry_direction?: 'bullish' | 'bearish';
}

export interface WatchlistEvaluation {
  id: string;
  watchlist_item_id: string;
  ticker: string;
  timestamp: string;
  previous_analysis_id?: string | null;
  status: 'benar' | 'floating' | 'meleset';
  price_movement_percent: number;
  price_movement_nominal: number;
  current_price: number;
  entry_price?: number;
  analysis_score: number;
  analysis_direction: 'bullish' | 'bearish';
  notes?: string | null;
}

export interface ThresholdConfig {
  id: string;
  version: string;
  rsi_oversold: number;
  rsi_overbought: number;
  atr_min_percent: number;
  atr_max_percent: number;
  volume_min_turnover: number;
  rvol_threshold: number;
  weight_momentum: number;
  weight_volume: number;
  max_display: number;
  enabled_indicators: string[];
  created_at: string;
}

export interface AccuracyStats {
  id: string;
  indicator: string;
  combination: string;
  score_range: string;
  total_evaluations: number;
  correct_count: number;
  floating_count: number;
  missed_count: number;
  hit_rate: number;
  updated_at: string;
}

export interface FilterState {
  searchQuery: string;
  sector: string;
  sortBy: 'score' | 'rsi' | 'volume' | 'price_change' | 'rvol';
  priceMin: number | null;
  priceMax: number | null;
  volumeMin: number | null;
  maxLossPercent: number | null;
  maxLossNominal: number | null;
  maxProfitPercent: number | null;
  maxProfitNominal: number | null;
}

export interface VolumeSpikeData {
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
