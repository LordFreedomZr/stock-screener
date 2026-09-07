'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThresholdConfig } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { Settings, Save, RotateCcw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SettingsPage() {
  const [config, setConfig] = useState<ThresholdConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultConfig: ThresholdConfig = {
    id: 'default',
    version: '1.0.0',
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
    created_at: new Date().toISOString(),
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('threshold_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setConfig(defaultConfig);
      } else {
        setConfig(data as ThresholdConfig);
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
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('threshold_configs').insert({
        version: config.version,
        rsi_period: config.rsi_period,
        rsi_oversold: config.rsi_oversold,
        rsi_overbought: config.rsi_overbought,
        macd_fast: config.macd_fast,
        macd_slow: config.macd_slow,
        macd_signal: config.macd_signal,
        roc_period: config.roc_period,
        atr_period: config.atr_period,
        atr_min_percent: config.atr_min_percent,
        atr_max_percent: config.atr_max_percent,
        volume_min_turnover: config.volume_min_turnover,
        rvol_threshold: config.rvol_threshold,
        weight_momentum: config.weight_momentum,
        weight_volume: config.weight_volume,
      });

      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  const updateConfig = (key: keyof ThresholdConfig, value: string | number) => {
    if (!config) return;
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setConfig({ ...config, [key]: numValue });
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
                  {[...Array(4)].map((_, j) => (
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
            Configure screening thresholds and weights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              RSI Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Period</label>
              <Input
                type="number"
                value={config?.rsi_period ?? 14}
                onChange={(e) => updateConfig('rsi_period', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Oversold Level</label>
              <Input
                type="number"
                value={config?.rsi_oversold ?? 30}
                onChange={(e) => updateConfig('rsi_oversold', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Overbought Level</label>
              <Input
                type="number"
                value={config?.rsi_overbought ?? 70}
                onChange={(e) => updateConfig('rsi_overbought', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              MACD Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Fast Period</label>
              <Input
                type="number"
                value={config?.macd_fast ?? 12}
                onChange={(e) => updateConfig('macd_fast', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Slow Period</label>
              <Input
                type="number"
                value={config?.macd_slow ?? 26}
                onChange={(e) => updateConfig('macd_slow', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Signal Period</label>
              <Input
                type="number"
                value={config?.macd_signal ?? 9}
                onChange={(e) => updateConfig('macd_signal', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              ATR & Volatility Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">ATR Period</label>
              <Input
                type="number"
                value={config?.atr_period ?? 14}
                onChange={(e) => updateConfig('atr_period', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Min ATR %</label>
              <Input
                type="number"
                step="0.1"
                value={config?.atr_min_percent ?? 1.5}
                onChange={(e) => updateConfig('atr_min_percent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max ATR %</label>
              <Input
                type="number"
                step="0.1"
                value={config?.atr_max_percent ?? 6.0}
                onChange={(e) => updateConfig('atr_max_percent', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

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
                value={config?.volume_min_turnover ?? 1000000000}
                onChange={(e) => updateConfig('volume_min_turnover', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">RVOL Threshold</label>
              <Input
                type="number"
                step="0.1"
                value={config?.rvol_threshold ?? 2.0}
                onChange={(e) => updateConfig('rvol_threshold', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Score Weights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Momentum Weight</label>
                  <span className="text-sm text-white">{config?.weight_momentum ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config?.weight_momentum ?? 50}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            weight_momentum: value,
                            weight_volume: 100 - value,
                          }
                        : prev
                    );
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Volume Weight</label>
                  <span className="text-sm text-white">{config?.weight_volume ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config?.weight_volume ?? 50}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            weight_volume: value,
                            weight_momentum: 100 - value,
                          }
                        : prev
                    );
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
