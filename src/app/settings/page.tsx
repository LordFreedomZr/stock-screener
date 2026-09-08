'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThresholdConfig } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Settings, Save, RotateCcw, Check, X } from 'lucide-react';

const defaultConfig: ThresholdConfig = {
  id: 'default',
  version: '1.0.0',
  rsi_oversold: 30,
  rsi_overbought: 70,
  atr_min_percent: 1.5,
  atr_max_percent: 6.0,
  volume_min_turnover: 500000000,
  rvol_threshold: 2.0,
  weight_momentum: 50,
  weight_volume: 50,
  created_at: new Date().toISOString(),
};

export default function SettingsPage() {
  const [config, setConfig] = useState<ThresholdConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('threshold_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching config:', error);
      } else if (data) {
        setConfig({
          id: data.id || 'default',
          version: data.version || '1.0.0',
          rsi_oversold: data.rsi_oversold ?? defaultConfig.rsi_oversold,
          rsi_overbought: data.rsi_overbought ?? defaultConfig.rsi_overbought,
          atr_min_percent: data.atr_min_percent ?? defaultConfig.atr_min_percent,
          atr_max_percent: data.atr_max_percent ?? defaultConfig.atr_max_percent,
          volume_min_turnover: data.volume_min_turnover ?? defaultConfig.volume_min_turnover,
          rvol_threshold: data.rvol_threshold ?? defaultConfig.rvol_threshold,
          weight_momentum: data.weight_momentum ?? defaultConfig.weight_momentum,
          weight_volume: data.weight_volume ?? defaultConfig.weight_volume,
          created_at: data.created_at || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const { error } = await supabase.from('threshold_configs').insert({
        version: config.version,
        rsi_oversold: config.rsi_oversold,
        rsi_overbought: config.rsi_overbought,
        atr_min_percent: config.atr_min_percent,
        atr_max_percent: config.atr_max_percent,
        volume_min_turnover: config.volume_min_turnover,
        rvol_threshold: config.rvol_threshold,
        weight_momentum: config.weight_momentum,
        weight_volume: config.weight_volume,
      });

      if (error) throw error;

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setSaveStatus(null);
  };

  const updateConfig = (key: keyof ThresholdConfig, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

    if (key === 'weight_momentum' || key === 'weight_volume') {
      const clamped = Math.min(100, Math.max(0, numValue));
      setConfig((prev) => ({
        ...prev,
        [key]: clamped,
        ...(key === 'weight_momentum' ? { weight_volume: 100 - clamped } : {}),
        ...(key === 'weight_volume' ? { weight_momentum: 100 - clamped } : {}),
      }));
    } else if (key.includes('percent') || key.includes('threshold')) {
      setConfig((prev) => ({ ...prev, [key]: Math.max(0, numValue) }));
    } else {
      setConfig((prev) => ({ ...prev, [key]: numValue }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="border-gray-800/50 bg-gray-900/50">
              <CardContent className="p-6">
                <div className="h-6 w-32 bg-gray-800 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-10 w-full bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            TradingView built-in indicators (RSI 14, MACD 12/26/9, ATR 14) - configure thresholds & weights below
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-emerald-400 text-sm">
              <Check className="w-4 h-4" /> Saved!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <X className="w-4 h-4" /> Failed
            </div>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* RSI Thresholds */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              RSI Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Oversold Level</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.rsi_oversold}
                onChange={(e) => updateConfig('rsi_oversold', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Overbought Level</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.rsi_overbought}
                onChange={(e) => updateConfig('rsi_overbought', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ATR & Volatility */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              ATR & Volatility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Min ATR %</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={config.atr_min_percent}
                onChange={(e) => updateConfig('atr_min_percent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max ATR %</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={config.atr_max_percent}
                onChange={(e) => updateConfig('atr_max_percent', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Volume */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Volume Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Min Turnover (Rp)</label>
              <Input
                type="number"
                min="0"
                value={config.volume_min_turnover}
                onChange={(e) => updateConfig('volume_min_turnover', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">RVOL Threshold</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={config.rvol_threshold}
                onChange={(e) => updateConfig('rvol_threshold', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Score Weights */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Score Weights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Momentum Weight</label>
                <span className="text-sm text-white">{config.weight_momentum}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.weight_momentum}
                onChange={(e) => updateConfig('weight_momentum', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Volume Weight</label>
                <span className="text-sm text-white">{config.weight_volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.weight_volume}
                onChange={(e) => updateConfig('weight_volume', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
