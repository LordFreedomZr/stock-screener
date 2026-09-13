-- Migration 005: Add new indicator columns and fix weights
-- Run this in Supabase Dashboard > SQL Editor

-- Add new weight columns
ALTER TABLE threshold_configs ADD COLUMN IF NOT EXISTS weight_volatility INTEGER DEFAULT 20;
ALTER TABLE threshold_configs ADD COLUMN IF NOT EXISTS weight_sentiment INTEGER DEFAULT 15;

-- Add enabled_indicators column (JSON array)
ALTER TABLE threshold_configs ADD COLUMN IF NOT EXISTS enabled_indicators JSONB DEFAULT '["rsi","macd","roc","rvol","atr","bb","stoch","adx","sentiment"]'::jsonb;

-- Update existing rows to have correct default weights (40/25/20/15)
UPDATE threshold_configs 
SET weight_momentum = 40, 
    weight_volume = 25, 
    weight_volatility = 20, 
    weight_sentiment = 15
WHERE weight_momentum = 50 AND weight_volume = 50;

-- Update schema version comment
COMMENT ON TABLE threshold_configs IS 'User scoring configuration - schema version 005';
