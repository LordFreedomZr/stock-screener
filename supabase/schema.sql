-- Database schema for Stock Screener IDX
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open DECIMAL(20, 4) NOT NULL,
  high DECIMAL(20, 4) NOT NULL,
  low DECIMAL(20, 4) NOT NULL,
  close DECIMAL(20, 4) NOT NULL,
  volume BIGINT NOT NULL,
  turnover DECIMAL(20, 4) NOT NULL,
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- Screening results table
CREATE TABLE IF NOT EXISTS screening_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  direction VARCHAR(10) CHECK (direction IN ('bullish', 'bearish')),
  rsi DECIMAL(10, 4),
  macd DECIMAL(20, 6),
  macd_signal DECIMAL(20, 6),
  roc DECIMAL(10, 4),
  rvol DECIMAL(10, 4),
  obv DECIMAL(20, 4),
  atr_percent DECIMAL(10, 4),
  turnover_avg DECIMAL(20, 4),
  price DECIMAL(20, 4),
  price_change_percent DECIMAL(10, 4),
  max_profit_percent DECIMAL(10, 4),
  max_profit_nominal DECIMAL(20, 4),
  max_loss_percent DECIMAL(10, 4),
  max_loss_nominal DECIMAL(20, 4),
  volume BIGINT,
  config_version VARCHAR(20),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- Watchlist items table
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'stopped')),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- Watchlist evaluations table
CREATE TABLE IF NOT EXISTS watchlist_evaluations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  watchlist_item_id UUID NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  previous_analysis_id UUID,
  status VARCHAR(20) CHECK (status IN ('benar', 'floating', 'meleset')),
  price_movement_percent DECIMAL(10, 4),
  price_movement_nominal DECIMAL(20, 4),
  current_price DECIMAL(20, 4),
  analysis_score INTEGER,
  analysis_direction VARCHAR(10),
  notes TEXT,
  FOREIGN KEY (watchlist_item_id) REFERENCES watchlist_items(id),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- Threshold configs table
CREATE TABLE IF NOT EXISTS threshold_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  rsi_period INTEGER DEFAULT 14,
  rsi_oversold INTEGER DEFAULT 30,
  rsi_overbought INTEGER DEFAULT 70,
  macd_fast INTEGER DEFAULT 12,
  macd_slow INTEGER DEFAULT 26,
  macd_signal INTEGER DEFAULT 9,
  roc_period INTEGER DEFAULT 12,
  atr_period INTEGER DEFAULT 14,
  atr_min_percent DECIMAL(10, 4) DEFAULT 1.5,
  atr_max_percent DECIMAL(10, 4) DEFAULT 6.0,
  volume_min_turnover DECIMAL(20, 4) DEFAULT 1000000000,
  rvol_threshold DECIMAL(10, 4) DEFAULT 2.0,
  weight_momentum INTEGER DEFAULT 50,
  weight_volume INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accuracy stats table
CREATE TABLE IF NOT EXISTS accuracy_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  indicator VARCHAR(100) NOT NULL,
  combination VARCHAR(255),
  score_range VARCHAR(50),
  total_evaluations INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  floating_count INTEGER DEFAULT 0,
  missed_count INTEGER DEFAULT 0,
  hit_rate DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_price_snapshots_ticker_timestamp ON price_snapshots(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_screening_results_ticker_timestamp ON screening_results(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_screening_results_timestamp ON screening_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ticker ON watchlist_items(ticker);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_status ON watchlist_items(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_evaluations_watchlist_item_id ON watchlist_evaluations(watchlist_item_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_evaluations_timestamp ON watchlist_evaluations(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accuracy_stats ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, since this is a personal app)
CREATE POLICY "Allow all on stocks" ON stocks FOR ALL USING (true);
CREATE POLICY "Allow all on price_snapshots" ON price_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all on screening_results" ON screening_results FOR ALL USING (true);
CREATE POLICY "Allow all on watchlist_items" ON watchlist_items FOR ALL USING (true);
CREATE POLICY "Allow all on watchlist_evaluations" ON watchlist_evaluations FOR ALL USING (true);
CREATE POLICY "Allow all on threshold_configs" ON threshold_configs FOR ALL USING (true);
CREATE POLICY "Allow all on accuracy_stats" ON accuracy_stats FOR ALL USING (true);

-- Insert default threshold config
INSERT INTO threshold_configs (version) VALUES ('1.0.0') ON CONFLICT DO NOTHING;
