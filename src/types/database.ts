export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      stocks: {
        Row: {
          id: string;
          ticker: string;
          name: string;
          sector: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticker: string;
          name: string;
          sector: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticker?: string;
          name?: string;
          sector?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      price_snapshots: {
        Row: {
          id: string;
          ticker: string;
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          turnover: number;
        };
        Insert: {
          id?: string;
          ticker: string;
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          turnover: number;
        };
        Update: {
          id?: string;
          ticker?: string;
          timestamp?: string;
          open?: number;
          high?: number;
          low?: number;
          close?: number;
          volume?: number;
          turnover?: number;
        };
      };
      screening_results: {
        Row: {
          id: string;
          ticker: string;
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
        };
        Insert: {
          id?: string;
          ticker: string;
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
        };
        Update: {
          id?: string;
          ticker?: string;
          timestamp?: string;
          score?: number;
          direction?: 'bullish' | 'bearish';
          rsi?: number;
          macd?: number;
          macd_signal?: number;
          roc?: number;
          rvol?: number;
          obv?: number;
          atr_percent?: number;
          turnover_avg?: number;
          price?: number;
          price_change_percent?: number;
          max_profit_percent?: number;
          max_profit_nominal?: number;
          max_loss_percent?: number;
          max_loss_nominal?: number;
          volume?: number;
          config_version?: string;
        };
      };
      watchlist_items: {
        Row: {
          id: string;
          ticker: string;
          status: 'active' | 'stopped';
          marked_at: string;
          stopped_at: string | null;
        };
        Insert: {
          id?: string;
          ticker: string;
          status?: 'active' | 'stopped';
          marked_at?: string;
          stopped_at?: string | null;
        };
        Update: {
          id?: string;
          ticker?: string;
          status?: 'active' | 'stopped';
          marked_at?: string;
          stopped_at?: string | null;
        };
      };
      watchlist_evaluations: {
        Row: {
          id: string;
          watchlist_item_id: string;
          ticker: string;
          timestamp: string;
          previous_analysis_id: string;
          status: 'benar' | 'floating' | 'meleset';
          price_movement_percent: number;
          price_movement_nominal: number;
          current_price: number;
          analysis_score: number;
          analysis_direction: 'bullish' | 'bearish';
          notes: string | null;
        };
        Insert: {
          id?: string;
          watchlist_item_id: string;
          ticker: string;
          timestamp: string;
          previous_analysis_id: string;
          status: 'benar' | 'floating' | 'meleset';
          price_movement_percent: number;
          price_movement_nominal: number;
          current_price: number;
          analysis_score: number;
          analysis_direction: 'bullish' | 'bearish';
          notes?: string | null;
        };
        Update: {
          id?: string;
          watchlist_item_id?: string;
          ticker?: string;
          timestamp?: string;
          previous_analysis_id?: string;
          status?: 'benar' | 'floating' | 'meleset';
          price_movement_percent?: number;
          price_movement_nominal?: number;
          current_price?: number;
          analysis_score?: number;
          analysis_direction?: 'bullish' | 'bearish';
          notes?: string | null;
        };
      };
      threshold_configs: {
        Row: {
          id: string;
          version: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          version: string;
          rsi_period?: number;
          rsi_oversold?: number;
          rsi_overbought?: number;
          macd_fast?: number;
          macd_slow?: number;
          macd_signal?: number;
          roc_period?: number;
          atr_period?: number;
          atr_min_percent?: number;
          atr_max_percent?: number;
          volume_min_turnover?: number;
          rvol_threshold?: number;
          weight_momentum?: number;
          weight_volume?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          version?: string;
          rsi_period?: number;
          rsi_oversold?: number;
          rsi_overbought?: number;
          macd_fast?: number;
          macd_slow?: number;
          macd_signal?: number;
          roc_period?: number;
          atr_period?: number;
          atr_min_percent?: number;
          atr_max_percent?: number;
          volume_min_turnover?: number;
          rvol_threshold?: number;
          weight_momentum?: number;
          weight_volume?: number;
          created_at?: string;
        };
      };
      accuracy_stats: {
        Row: {
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
        };
        Insert: {
          id?: string;
          indicator: string;
          combination: string;
          score_range: string;
          total_evaluations?: number;
          correct_count?: number;
          floating_count?: number;
          missed_count?: number;
          hit_rate?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          indicator?: string;
          combination?: string;
          score_range?: string;
          total_evaluations?: number;
          correct_count?: number;
          floating_count?: number;
          missed_count?: number;
          hit_rate?: number;
          updated_at?: string;
        };
      };
    };
  };
}
