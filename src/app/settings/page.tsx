'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThresholdConfig } from '@/types';
import { Settings, Save, RotateCcw, Check, X, Zap, BarChart3, Activity, TrendingUp, Info } from 'lucide-react';

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
  enabled_indicators: ['rsi', 'macd', 'roc', 'rvol', 'atr'],
  created_at: new Date().toISOString(),
};

interface IndicatorDef {
  id: string;
  name: string;
  description: string;
  category: 'momentum' | 'volume' | 'volatility';
  enabled: boolean;
  params: { key: string; label: string; min: number; max: number; step: number }[];
  info: {
    fungsi: string;
    caraBaca: string;
    tips: string;
  };
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
    info: {
      fungsi: 'Mengukur kecepatan dan perubahan harga saham. RSI bergerak antara 0-100. Semakin tinggi RSI, semakin kuat momentum naik. Semakin rendah, semakin kuat momentum turun.',
      caraBaca: 'RSI < 30 = Oversold (kemungkinan harga akan naik). RSI > 70 = Overbought (kemungkinan harga akan turun). RSI 40-60 = Netral/tidak ada tren kuat.',
      tips: 'Gunakan RSI oversold (30) sebagai sinyal beli, overbought (70) sebagai sinyal jual. Kombinasikan dengan trendline untuk konfirmasi.',
    },
  },
  {
    id: 'macd',
    name: 'MACD (12/26/9)',
    description: 'Moving Average Convergence Divergence',
    category: 'momentum',
    enabled: true,
    params: [],
    info: {
      fungsi: 'Menunjukkan hubungan antara dua moving average (12 hari dan 26 hari). MACD Line = EMA12 - EMA26. Signal Line = EMA9 dari MACD Line. Histogram = perbedaan antara MACD dan Signal.',
      caraBaca: 'MACD Line di atas Signal Line = Bullish (harga naik). MACD Line di bawah Signal Line = Bearish (harga turun). Histogram positif = momentum naik, negatif = momentum turun.',
      tips: 'Cari crossover: MACD cross ke atas Signal = sinyal beli. MACD cross ke bawah Signal = sinyal jual. Semakin besar histogram, semakin kuat momentum.',
    },
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
    info: {
      fungsi: 'Mengukur volatilitas (kenaikan/penurunan harga rata-rata) dalam persentase dari harga. ATR tinggi = harga bergerak liar, ATR rendah = harga stabil.',
      caraBaca: 'ATR < 1.5% = Saham kurang volatile (cocok untuk investor konservatif). ATR 1.5-6% = Volatile moderat (cocok untuk swing trading). ATR > 6% = Sangat volatile (risiko tinggi, potensi untung besar).',
      tips: 'Filter saham dengan ATR terlalu rendah (kurang minat) dan terlalu tinggi (terlalu berisiko). ATR 1.5-6% adalah range ideal untuk trading aktif.',
    },
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
    info: {
      fungsi: 'Membandingkan volume perdagangan hari ini dengan rata-rata 10 hari terakhir. RVOL 2.0 = volume 2x lipat dari biasanya. Menunjukkan apakah ada minat besar dari institusi atau ritel.',
      caraBaca: 'RVOL < 1.0 = Volume rendah, kurang minat. RVOL 1.0-2.0 = Normal. RVOL > 2.0 = Volume tinggi, ada minat besar. RVOL > 3.0 = Sangat tinggi, kemungkinan ada berita/hype.',
      tips: 'Saham dengan RVOL tinggi lebih likuid dan lebih mudah masuk/keluar. Gunakan RVOL > 2.0 sebagai filter untuk memastikan ada minat yang cukup.',
    },
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
    info: {
      fungsi: 'Memastikan saham memiliki likuiditas yang cukup agar mudah dibeli/dijual tanpa menggerakkan harga. Turnover = total nilai transaksi dalam Rupiah.',
      caraBaca: 'Turnover < 500 juta = Likuiditas rendah, sulit jual/beli. Turnover 500 juta - 2 miliar = Cukup. Turnover > 2 miliar = Likuiditas tinggi, mudah transaksi.',
      tips: 'Gunakan minimal Rp500 juto turnover untuk memastikan bisa masuk/keluar saham tanpa slippage besar. Untuk saham blue chip, gunakan Rp1 miliar+.',
    },
  },
  {
    id: 'perf',
    name: 'Perf.W',
    description: 'Weekly performance / ROC',
    category: 'momentum',
    enabled: true,
    params: [],
    info: {
      fungsi: 'Menunjukkan perubahan harga dalam persentase selama 1 minggu terakhir. Positive = harga naik minggu ini. Negative = harga turun minggu ini.',
      caraBaca: 'Perf.W > 0 = Harga naik minggu ini (bullish). Perf.W < 0 = Harga turun minggu ini (bearish). Semakin besar persentase, semakin kuat pergerakan.',
      tips: 'Gunakan sebagai konfirmasi tren. Saham dengan Perf.W positif dan RVOL tinggi menunjukkan minat beli yang kuat. Perf.W negatif bisa jadi peluang beli (buy the dip) jika RSI oversold.',
    },
  },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<ThresholdConfig>(defaultConfig);
  const [indicators, setIndicators] = useState<IndicatorDef[]>(defaultIndicators);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [infoModal, setInfoModal] = useState<IndicatorDef | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const savedMaxDisplay = localStorage.getItem('max_display');
      if (savedMaxDisplay) {
        setConfig((prev) => ({ ...prev, max_display: parseInt(savedMaxDisplay) || 18 }));
      }

      // Load enabled indicators from localStorage
      const savedEnabled = localStorage.getItem('enabled_indicators');
      if (savedEnabled) {
        try {
          const enabledIds: string[] = JSON.parse(savedEnabled);
          setIndicators((prev) => prev.map((ind) => ({
            ...ind,
            enabled: enabledIds.includes(ind.id),
          })));
        } catch {}
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
          enabled_indicators: data.enabled_indicators ?? defaultConfig.enabled_indicators,
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
      localStorage.setItem('max_display', config.max_display.toString());
      localStorage.setItem('enabled_indicators', JSON.stringify(indicators.filter(i => i.enabled).map(i => i.id)));

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
          enabled_indicators: indicators.filter(i => i.enabled).map(i => i.id),
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
          <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pilih indikator TradingView yang ingin digunakan untuk screening
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-emerald-400 text-sm">
              <Check className="w-4 h-4" /> Tersimpan!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <X className="w-4 h-4" /> Gagal
            </div>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600 text-gray-950">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan'}
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
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  ind.enabled
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-gray-800/50 bg-gray-900/30 opacity-60'
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => toggleIndicator(ind.id)}
                >
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
                <div className="flex items-center gap-2">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoModal(ind);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
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

        {/* Score Weights */}
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

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{infoModal.name}</h3>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                      infoModal.category === 'momentum'
                        ? 'bg-blue-500/10 text-blue-400'
                        : infoModal.category === 'volume'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    {infoModal.category}
                  </span>
                </div>
                <button
                  onClick={() => setInfoModal(null)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 mb-1">Fungsi</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{infoModal.info.fungsi}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 mb-1">Cara Membaca</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{infoModal.info.caraBaca}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 mb-1">Tips Penggunaan</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{infoModal.info.tips}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
              <button
                onClick={() => setInfoModal(null)}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-medium rounded-lg transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
