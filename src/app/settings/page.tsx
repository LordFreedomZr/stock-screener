'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThresholdConfig } from '@/types';
import { Settings, Save, RotateCcw, Check, X, Zap, BarChart3, Activity, TrendingUp } from 'lucide-react';

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
  max_display: 18,
  created_at: new Date().toISOString(),
};

interface IndicatorDef {
  id: string;
  name: string;
  description: string;
  category: 'momentum' | 'volume' | 'volatility';
  enabled: boolean;
  params: { key: string; label: string; min: number; max: number; step: number }[];
}

const defaultIndicators: IndicatorDef[] = [
  {
    id: 'rsi',
    name: 'RSI (14)',
    description: 'Relative Strength Index - momentum oscillator',
    category: 'momentum',
    enabled: true,
    params: [
      { key: 'rsi_oversold', label: 'Oversold', min: 0, max: 50, step: 1 },
      { key: 'rsi_overbought', label: 'Overbought', min: 50, max: 100, step: 1 },
    ],
  },
  {
    id: 'macd',
    name: 'MACD (12/26/9)',
    description: 'Moving Average Convergence Divergence',
    category: 'momentum',
    enabled: true,
    params: [],
  },
  {
    id: 'atr',
    name: 'ATR (14)',
    description: 'Average True Range - volatility measure',
    category: 'volatility',
    enabled: true,
    params: [
      { key: 'atr_min_percent', label: 'Min ATR %', min: 0, max: 10, step: 0.1 },
      { key: 'atr_max_percent', label: 'Max ATR %', min: 0, max: 20, step: 0.1 },
    ],
  },
  {
    id: 'rvol',
    name: 'RVOL',
    description: 'Relative Volume - volume vs 10-day average',
    category: 'volume',
    enabled: true,
    params: [
      { key: 'rvol_threshold', label: 'Min RVOL', min: 0, max: 10, step: 0.1 },
    ],
  },
  {
    id: 'turnover',
    name: 'Min Turnover',
    description: 'Minimum daily turnover in IDR',
    category: 'volume',
    enabled: true,
    params: [
      { key: 'volume_min_turnover', label: 'Min Turnover (Rp)', min: 0, max: 10000000000, step: 100000000 },
    ],
  },
  {
    id: 'perf',
    name: 'Perf.W',
    description: 'Weekly performance / ROC',
    category: 'momentum',
    enabled: true,
    params: [],
  },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<ThresholdConfig>(defaultConfig);
  const [indicators, setIndicators] = useState<IndicatorDef[]>(defaultIndicators);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      // Load max_display from localStorage
      const savedMaxDisplay = localStorage.getItem('max_display');
      if (savedMaxDisplay) {
        setConfig((prev) => ({ ...prev, max_display: parseInt(savedMaxDisplay) || 18 }));
      }

      const res = await fetch('/api/settings');
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data;
        setConfig((prev) => ({
          ...prev,
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
        }));
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
      // Save max_display to localStorage
      localStorage.setItem('max_display', config.max_display.toString());

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: config.version,
          rsi_oversold: config.rsi_oversold,
          rsi_overbought: config.rsi_overbought,
          atr_min_percent: config.atr_min_percent,
          atr_max_percent: config.atr_max_percent,
          volume_min_turnover: config.volume_min_turnover,
          rvol_threshold: config.rvol_threshold,
          weight_momentum: config.weight_momentum,
          weight_volume: config.weight_volume,
        }),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

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
    setIndicators(defaultIndicators);
    setSaveStatus(null);
  };

  const toggleIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
    );
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

  const activeIndicators = indicators.filter((i) => i.enabled);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-gray-800/50 bg-gray-900/50">
              <CardContent className="p-6">
                <div className="h-6 w-32 bg-gray-800 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  {[...Array(2)].map((_, j) => (
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pilih indikator TradingView yang ingin digunakan untuk screening
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
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600 text-gray-950">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Active Indicators Summary */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Zap className="w-4 h-4 text-cyan-400" />
        <span>{activeIndicators.length} indikator aktif:</span>
        <div className="flex gap-1 flex-wrap">
          {activeIndicators.map((ind) => (
            <span key={ind.id} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
              {ind.name}
            </span>
          ))}
        </div>
      </div>

      {/* Indicator Checklist */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Indikator TradingView
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {indicators.map((ind) => (
              <div
                key={ind.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  ind.enabled
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-gray-800/50 bg-gray-900/30 opacity-60'
                }`}
                onClick={() => toggleIndicator(ind.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      ind.enabled ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'
                    }`}
                  >
                    {ind.enabled && <Check className="w-3 h-3 text-gray-950" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ind.name}</p>
                    <p className="text-xs text-gray-500">{ind.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    ind.category === 'momentum'
                      ? 'bg-blue-500/10 text-blue-400'
                      : ind.category === 'volume'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {ind.category}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parameter Settings for Active Indicators */}
      <div className="grid gap-6 md:grid-cols-2">
        {indicators
          .filter((ind) => ind.enabled && ind.params.length > 0)
          .map((ind) => (
            <Card key={ind.id} className="border-gray-800/50 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  {ind.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ind.params.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <label className="text-sm text-gray-400">{param.label}</label>
                    <Input
                      type="number"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={config[param.key as keyof ThresholdConfig] ?? 0}
                      onChange={(e) => updateConfig(param.key as keyof ThresholdConfig, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

        {/* Score Weights - always shown */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Bobot Skor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Momentum</label>
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
                <label className="text-sm text-gray-400">Volume</label>
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

        {/* Display Settings */}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Tampilan Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Jumlah Saham Ditampilkan</label>
              <Input
                type="number"
                min="1"
                max="150"
                value={config.max_display}
                onChange={(e) => updateConfig('max_display', parseInt(e.target.value) || 18)}
              />
              <p className="text-xs text-gray-500">Default: 18 saham (diurutkan dari skor tertinggi)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
