'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StockChart } from '@/components/charts/stock-chart';
import { RSIChart } from '@/components/charts/rsi-chart';
import { MACDChart } from '@/components/charts/macd-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreeningResult, PriceSnapshot } from '@/types';
import { formatCurrency, formatNumber, formatPercent, getScoreColor, getDirectionColor } from '@/lib/utils';
import { 
  TrendingUp, TrendingDown, ArrowLeft, Star, Activity, BarChart3, 
  Zap, Target, Shield, Clock, RefreshCw, LineChart, Newspaper, ExternalLink,
  CheckCircle, AlertTriangle, Minus, FileText
} from 'lucide-react';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;

  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [priceData, setPriceData] = useState<PriceSnapshot[]>([]);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<{ range: string; interval: string; label: string }>({ range: '3mo', interval: '1d', label: '3M' });
  const [news, setNews] = useState<{ title: string; link: string; publisher: string; publishedAt: string; thumbnail?: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [mtfData, setMtfData] = useState<Record<string, { rsi: number; macd: number; macd_signal: number; roc: number; rvol: number; direction: string }>>({});
  const [mtfLoading, setMtfLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const TIMEFRAMES = [
    { range: '1mo', interval: '1d', label: '1M' },
    { range: '3mo', interval: '1d', label: '3M' },
    { range: '6mo', interval: '1d', label: '6M' },
    { range: '1y', interval: '1d', label: '1Y' },
    { range: '2y', interval: '1wk', label: '2Y' },
    { range: '5y', interval: '1mo', label: '5Y' },
  ];

  // Calculate RSI from price data (must be before any conditional returns)
  const rsiData = useMemo(() => {
    if (!priceData.length) return [];
    const closes = priceData.map(d => d.close);
    const period = 14;
    const rsiResults: { timestamp: string; rsi: number }[] = [];

    for (let i = period; i < closes.length; i++) {
      let gains = 0;
      let losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiResults.push({ timestamp: priceData[i].timestamp, rsi });
    }
    return rsiResults;
  }, [priceData]);

  // Calculate MACD from price data (must be before any conditional returns)
  const macdData = useMemo(() => {
    if (!priceData.length) return [];
    const closes = priceData.map(d => d.close);
    
    const calcEMA = (data: number[], period: number) => {
      const k = 2 / (period + 1);
      const ema = [data[0]];
      for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
      }
      return ema;
    };

    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calcEMA(macdLine, 9);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);

    return priceData.map((d, i) => ({
      timestamp: d.timestamp,
      macd: macdLine[i],
      macd_signal: signalLine[i],
      macd_histogram: histogram[i],
    }));
  }, [priceData]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const load = async () => {
      setFetching(true);
      try {
        const savedEnabled = localStorage.getItem('enabled_indicators');
        const enabledIndicators = savedEnabled ? JSON.parse(savedEnabled) : ['rsi', 'macd', 'roc', 'rvol', 'atr', 'bb', 'stoch', 'adx', 'sentiment'];
        
        const params = new URLSearchParams();
        if (enabledIndicators.length > 0) {
          params.set('enabled', enabledIndicators.join(','));
        }

        let found = false;
        const screeningResponse = await fetch(`/api/screening?${params.toString()}`, {
          signal: controller.signal,
        });
        const screeningData = await screeningResponse.json();
        
        if (screeningData.success && screeningData.data) {
          const stockData = screeningData.data.find((s: ScreeningResult) => s.ticker === ticker);
          if (stockData) {
            setResult(stockData);
            found = true;
          }
        }

        if (!found) {
          const stockResponse = await fetch(`/api/stock/${encodeURIComponent(ticker)}?${params.toString()}`, {
            signal: controller.signal,
          });
          const stockJson = await stockResponse.json();
          if (stockJson.success && stockJson.data) {
            setResult(stockJson.data as ScreeningResult);
          }
        }

        const historyResponse = await fetch(`/api/history/${encodeURIComponent(ticker)}?range=${timeframe.range}&interval=${timeframe.interval}`, {
          signal: controller.signal,
        });
        const historyData = await historyResponse.json();
        
        if (historyData.success && historyData.data) {
          setPriceData(historyData.data as PriceSnapshot[]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error fetching stock data:', error);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    load();
    return () => controller.abort();
  }, [ticker, timeframe.range, timeframe.interval]);

  const handleRefresh = () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const load = async () => {
      setFetching(true);
      try {
        const savedEnabled = localStorage.getItem('enabled_indicators');
        const enabledIndicators = savedEnabled ? JSON.parse(savedEnabled) : ['rsi', 'macd', 'roc', 'rvol', 'atr', 'bb', 'stoch', 'adx', 'sentiment'];
        
        const params = new URLSearchParams();
        if (enabledIndicators.length > 0) {
          params.set('enabled', enabledIndicators.join(','));
        }

        let found = false;
        const screeningResponse = await fetch(`/api/screening?${params.toString()}`, {
          signal: controller.signal,
        });
        const screeningData = await screeningResponse.json();
        
        if (screeningData.success && screeningData.data) {
          const stockData = screeningData.data.find((s: ScreeningResult) => s.ticker === ticker);
          if (stockData) {
            setResult(stockData);
            found = true;
          }
        }

        if (!found) {
          const stockResponse = await fetch(`/api/stock/${encodeURIComponent(ticker)}?${params.toString()}`, {
            signal: controller.signal,
          });
          const stockJson = await stockResponse.json();
          if (stockJson.success && stockJson.data) {
            setResult(stockJson.data as ScreeningResult);
          }
        }

        const historyResponse = await fetch(`/api/history/${encodeURIComponent(ticker)}?range=${timeframe.range}&interval=${timeframe.interval}`, {
          signal: controller.signal,
        });
        const historyData = await historyResponse.json();
        
        if (historyData.success && historyData.data) {
          setPriceData(historyData.data as PriceSnapshot[]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error fetching stock data:', error);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    load();
  };

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const response = await fetch('/api/watchlist');
        const data = await response.json();
        if (data.success && data.data) {
          const inWatchlist = data.data.some((item: { ticker: string; status: string }) => item.ticker === ticker && item.status === 'active');
          setIsInWatchlist(inWatchlist);
        }
      } catch (error) {
        console.error('Error checking watchlist:', error);
      }
    };

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const res = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setNews(data.data);
        }
      } catch {}
      setNewsLoading(false);
    };

    const fetchMTF = async () => {
      setMtfLoading(true);
      try {
        const timeframes = [
          { label: '1D', range: '5d', interval: '1d' },
          { label: '1W', range: '1mo', interval: '1d' },
          { label: '1M', range: '3mo', interval: '1d' },
          { label: '3M', range: '6mo', interval: '1d' },
          { label: '6M', range: '1y', interval: '1d' },
          { label: '1Y', range: '2y', interval: '1wk' },
        ];

        const mtfResults: Record<string, { rsi: number; macd: number; macd_signal: number; roc: number; rvol: number; direction: string }> = {};

        for (const tf of timeframes) {
          try {
            const res = await fetch(`/api/history/${encodeURIComponent(ticker)}?range=${tf.range}&interval=${tf.interval}`);
            const data = await res.json();
            if (data.success && data.data && data.data.length > 20) {
              const closes = data.data.map((d: { close: number }) => d.close);
              const volumes = data.data.map((d: { volume: number }) => d.volume);

              const period = 14;
              let gains = 0, losses = 0;
              for (let i = closes.length - period; i < closes.length; i++) {
                const change = closes[i] - closes[i - 1];
                if (change > 0) gains += change;
                else losses -= change;
              }
              const avgGain = gains / period;
              const avgLoss = losses / period;
              const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
              const rsi = 100 - (100 / (1 + rs));

              const k = 2 / (13);
              const ema12 = [closes[0]];
              const ema26 = [closes[0]];
              for (let i = 1; i < closes.length; i++) {
                ema12.push(closes[i] * k + ema12[i - 1] * (1 - k));
                ema26.push(closes[i] * (2 / 27) + ema26[i - 1] * (1 - 2 / 27));
              }
              const macdLine = ema12.map((v, i) => v - ema26[i]);
              const signalLine = [macdLine[0]];
              for (let i = 1; i < macdLine.length; i++) {
                signalLine.push(macdLine[i] * (2 / 10) + signalLine[i - 1] * (1 - 2 / 10));
              }
              const macd = macdLine[macdLine.length - 1];
              const signal = signalLine[signalLine.length - 1];

              const weekAgo = closes[Math.max(0, closes.length - 5)];
              const roc = weekAgo > 0 ? ((closes[closes.length - 1] - weekAgo) / weekAgo) * 100 : 0;

              const avgVol = volumes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10;
              const rvol = avgVol > 0 ? volumes[volumes.length - 1] / avgVol : 1;

              const momentumScore = (rsi > 50 ? 0.5 : -0.5) + (macd > signal ? 0.3 : -0.3) + (roc > 0 ? 0.2 : -0.2);

              mtfResults[tf.label] = { rsi, macd, macd_signal: signal, roc, rvol, direction: momentumScore > 0 ? 'bullish' : 'bearish' };
            }
          } catch {}
        }

        setMtfData(mtfResults);
      } catch {}
      setMtfLoading(false);
    };

    checkWatchlist();
    fetchNews();
    fetchMTF();
  }, [ticker]);

  const toggleWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const action = isInWatchlist ? 'stop' : 'add';
      const payload: Record<string, unknown> = { ticker, action };
      if (action === 'add' && result) {
        payload.price = result.price;
        payload.score = result.score;
        payload.direction = result.direction;
      }
      
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setIsInWatchlist(!isInWatchlist);
      } else {
        console.error('Failed to update watchlist:', data.error);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Derived state (before early returns to satisfy hooks rules)
  const isBullish = result?.direction === 'bullish';

  const narrative = useMemo(() => {
    if (!result) return null;

    const sections: { title: string; text: string; color: string }[] = [];

    // 1. Kesimpulan Utama
    const verdictColor = isBullish ? 'emerald' : 'red';
    const verdictText = isBullish
      ? `${ticker} menunjukkan sinyal bullish dengan skor ${result.score}/5.`
      : `${ticker} menunjukkan sinyal bearish dengan skor ${result.score}/5.`;
    sections.push({ title: 'Kesimpulan Utama', text: verdictText, color: verdictColor });

    // 2. Momentum
    const momentumParts: string[] = [];
    if (result.rsi < 30) momentumParts.push(`RSI ${result.rsi.toFixed(1)} di zona oversold, potensi rebound`);
    else if (result.rsi > 70) momentumParts.push(`RSI ${result.rsi.toFixed(1)} di zona overbought, berhati-hati`);
    else momentumParts.push(`RSI ${result.rsi.toFixed(1)} netral`);

    if (result.macd > result.macd_signal) momentumParts.push('MACD di atas sinyal (bullish cross)');
    else momentumParts.push('MACD di bawah sinyal (bearish cross)');

    if (result.roc > 0) momentumParts.push(`ROC +${result.roc.toFixed(1)}% menunjukkan laju naik`);
    else momentumParts.push(`ROC ${result.roc.toFixed(1)}% menunjukkan laju turun`);

    if (result.stoch_k !== undefined) {
      if (result.stoch_k < 20) momentumParts.push(`Stochastic ${result.stoch_k.toFixed(0)} oversold`);
      else if (result.stoch_k > 80) momentumParts.push(`Stochastic ${result.stoch_k.toFixed(0)} overbought`);
    }

    const momentumScore = (result.rsi > 50 ? 1 : -1) + (result.macd > result.macd_signal ? 1 : -1) + (result.roc > 0 ? 1 : -1);
    const momentumLabel = momentumScore >= 2 ? 'Kuat' : momentumScore <= -2 ? 'Lemah' : 'Campuran';
    sections.push({ title: 'Momentum', text: `${momentumParts.join('. ')}. Momentum ${momentumLabel}.`, color: momentumScore >= 1 ? 'emerald' : 'red' });

    // 3. Volume
    const volumeParts: string[] = [];
    if (result.rvol >= 2) volumeParts.push(`RVOL ${result.rvol.toFixed(1)}x — volume sangat aktif, minat tinggi`);
    else if (result.rvol >= 1.5) volumeParts.push(`RVOL ${result.rvol.toFixed(1)}x — volume di atas normal`);
    else if (result.rvol >= 1) volumeParts.push(`RVOL ${result.rvol.toFixed(1)}x — volume normal`);
    else volumeParts.push(`RVOL ${result.rvol.toFixed(1)}x — volume sepi, kurang minat`);

    if (result.volume_spike) {
      const vs = result.volume_spike;
      if (vs.yesterday > vs.avg_5d * 2) volumeParts.push(`Spike volume kemarin ${((vs.yesterday / vs.avg_5d - 1) * 100).toFixed(0)}% dari rata-rata 5 hari`);
    }

    sections.push({ title: 'Volume', text: volumeParts.join('. ') + '.', color: result.rvol >= 1.5 ? 'cyan' : 'gray' });

    // 4. Volatilitas
    const volParts: string[] = [];
    if (result.atr_percent >= 3) volParts.push(`ATR ${result.atr_percent.toFixed(1)}% — volatilitas tinggi, cocok untuk swing trading`);
    else if (result.atr_percent >= 1.5) volParts.push(`ATR ${result.atr_percent.toFixed(1)}% — volatilitas moderat`);
    else volParts.push(`ATR ${result.atr_percent.toFixed(1)}% — volatilitas rendah, pergerakan terbatas`);

    if (result.bb_percent !== undefined) {
      if (result.bb_percent < 0.2) volParts.push(`Harga dekat lower BB, potensi bounce`);
      else if (result.bb_percent > 0.8) volParts.push(`Harga dekat upper BB, potensi pullback`);
      else volParts.push(`Harga di tengah BB (position ${(result.bb_percent * 100).toFixed(0)}%)`);
    }

    if (result.adx !== undefined && result.adx > 25) {
      const trendDir = result.plus_di && result.minus_di && result.plus_di > result.minus_di ? 'naik' : 'turun';
      volParts.push(`ADX ${result.adx.toFixed(0)} — tren ${trendDir} kuat`);
    } else if (result.adx !== undefined) {
      volParts.push(`ADX ${result.adx.toFixed(0)} — tren lemah, potensi konsolidasi`);
    }

    sections.push({ title: 'Volatilitas & Tren', text: volParts.join('. ') + '.', color: result.atr_percent >= 2.5 ? 'purple' : 'gray' });

    // 5. Multi-Timeframe Alignment
    const mtfKeys = Object.keys(mtfData);
    if (mtfKeys.length >= 3) {
      const bullCount = mtfKeys.filter(k => mtfData[k].direction === 'bullish').length;
      const total = mtfKeys.length;
      const alignment = bullCount === total ? 'semua timeframe bullish'
        : bullCount === 0 ? 'semua timeframe bearish'
        : `${bullCount}/${total} timeframe bullish`;
      const alignColor = bullCount === total ? 'emerald' : bullCount === 0 ? 'red' : 'yellow';
      sections.push({ title: 'Multi-Timeframe', text: `Arah ${alignment}.`, color: alignColor });
    }

    // 6. Sentimen
    if (result.sentiment_score !== undefined && result.sentiment_score !== 0) {
      const sentLabel = result.sentiment_label === 'positive' ? 'Positif' : result.sentiment_label === 'negative' ? 'Negatif' : 'Netral';
      const sentText = `Sentimen berita: ${sentLabel} (score ${result.sentiment_score.toFixed(2)}). ${
        result.sentiment_score > 0.3 ? 'Berita mendukung arah naik.' :
        result.sentiment_score < -0.3 ? 'Berita mendukung arah turun.' : 'Tidak ada sentimen kuat dari berita.'
      }`;
      sections.push({ title: 'Sentimen', text: sentText, color: result.sentiment_score > 0 ? 'teal' : 'red' });
    }

    // 7. Risk/Reward
    const rrRatio = result.max_loss_percent !== 0
      ? (result.max_profit_percent / Math.abs(result.max_loss_percent)).toFixed(1)
      : '-';
    sections.push({
      title: 'Risiko & Reward',
      text: `Profit maksimal +${result.max_profit_percent.toFixed(1)}% (${formatCurrency(result.max_profit_nominal)}), loss maksimal ${result.max_loss_percent.toFixed(1)}% (${formatCurrency(result.max_loss_nominal)}). Rasio R:R = ${rrRatio}:1.`,
      color: Number(rrRatio) >= 2 ? 'emerald' : Number(rrRatio) >= 1 ? 'yellow' : 'red'
    });

    // 8. Level Kunci
    if (result.bb_upper && result.bb_lower) {
      sections.push({
        title: 'Level Kunci (Bollinger Bands)',
        text: `Resistance: ${formatCurrency(result.bb_upper)} | Support: ${formatCurrency(result.bb_lower)} | Middle: ${formatCurrency(result.bb_middle || 0)}`,
        color: 'blue'
      });
    }

    return sections;
  }, [result, mtfData, isBullish, ticker]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Saham Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-4">Tidak ada data screening untuk {ticker}</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{ticker}</h1>
              <Badge variant={isBullish ? 'success' : 'destructive'}>
                {isBullish ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {result.direction}
              </Badge>
            </div>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              Data real-time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={fetching}
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant={isInWatchlist ? 'secondary' : 'default'}
            onClick={toggleWatchlist}
            disabled={watchlistLoading}
          >
            <Star className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {watchlistLoading ? 'Memuat...' : isInWatchlist ? 'Di Watchlist' : 'Tambah ke Watchlist'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Harga Saat Ini</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(result.price)}</p>
            <p className={getDirectionColor(result.direction)}>
              {formatPercent(result.price_change_percent)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Skor</p>
            <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}
            </p>
            <p className="text-xs text-gray-500">dari 5</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Profit Maksimal</p>
            <p className="text-2xl font-bold text-emerald-400">
              +{formatPercent(result.max_profit_percent)}
            </p>
            <p className="text-xs text-gray-500">{formatCurrency(result.max_profit_nominal)}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Loss Maksimal</p>
            <p className="text-2xl font-bold text-red-400">
              {formatPercent(result.max_loss_percent)}
            </p>
            <p className="text-xs text-gray-500">{formatCurrency(result.max_loss_nominal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Grafik Harga
            </CardTitle>
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 text-xs rounded ${
                    timeframe.label === tf.label
                      ? 'bg-cyan-500 text-gray-950 font-medium'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StockChart data={priceData} height={350} indicators={{ showVolume: true }} />
        </CardContent>
      </Card>

      {/* Indicator Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              RSI (14)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rsiData.length > 0 ? (
              <RSIChart data={rsiData} height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">
                Memuat data RSI...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-400" />
              MACD (12/26/9)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {macdData.length > 0 ? (
              <MACDChart data={macdData} height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">
                Memuat data MACD...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-500">RSI</span>
            </div>
            <p className="text-xl font-bold text-white">{result.rsi.toFixed(1)}</p>
            <p className="text-xs text-gray-500">
              {result.rsi < 30 ? 'Oversold' : result.rsi > 70 ? 'Overbought' : 'Netral'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-500">MACD</span>
            </div>
            <p className="text-xl font-bold text-white">{result.macd.toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              Sinyal: {result.macd_signal.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-500">ROC</span>
            </div>
            <p className="text-xl font-bold text-white">{result.roc.toFixed(2)}%</p>
            <p className="text-xs text-gray-500">Laju Perubahan</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-500">RVOL</span>
            </div>
            <p className="text-xl font-bold text-white">{result.rvol.toFixed(2)}x</p>
            <p className="text-xs text-gray-500">Volume Relatif</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-500">ATR%</span>
            </div>
            <p className="text-xl font-bold text-white">{result.atr_percent.toFixed(2)}%</p>
            <p className="text-xs text-gray-500">Volatilitas</p>
          </CardContent>
        </Card>
        {result.stoch_k !== undefined && (
          <Card className="border-gray-800/50 bg-gray-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-gray-500">Stochastic</span>
              </div>
              <p className="text-xl font-bold text-white">{result.stoch_k.toFixed(1)}</p>
              <p className="text-xs text-gray-500">
                D: {result.stoch_d?.toFixed(1) ?? '-'} | {result.stoch_k < 20 ? 'Oversold' : result.stoch_k > 80 ? 'Overbought' : 'Netral'}
              </p>
            </CardContent>
          </Card>
        )}
        {result.bb_percent !== undefined && (
          <Card className="border-gray-800/50 bg-gray-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-gray-500">Bollinger %B</span>
              </div>
              <p className="text-xl font-bold text-white">{(result.bb_percent * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">
                {result.bb_percent < 0.2 ? 'Dekat Lower' : result.bb_percent > 0.8 ? 'Dekat Upper' : 'Netral'}
              </p>
            </CardContent>
          </Card>
        )}
        {result.adx !== undefined && (
          <Card className="border-gray-800/50 bg-gray-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-500">ADX</span>
              </div>
              <p className="text-xl font-bold text-white">{result.adx.toFixed(1)}</p>
              <p className="text-xs text-gray-500">
                {result.adx > 25 ? (result.plus_di && result.minus_di && result.plus_di > result.minus_di ? 'Tren Naik Kuat' : 'Tren Turun Kuat') : 'Tren Lemah'}
              </p>
            </CardContent>
          </Card>
        )}
        {result.sentiment_score !== undefined && result.sentiment_score !== 0 && (
          <Card className="border-gray-800/50 bg-gray-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-4 h-4 text-teal-400" />
                <span className="text-sm text-gray-500">Sentimen</span>
              </div>
              <p className="text-xl font-bold text-white">
                {result.sentiment_label === 'positive' ? 'Positif' : result.sentiment_label === 'negative' ? 'Negatif' : 'Netral'}
              </p>
              <p className="text-xs text-gray-500">
                Score: {result.sentiment_score.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-500">OBV</span>
            </div>
            <p className="text-xl font-bold text-white">{formatNumber(result.obv)}</p>
            <p className="text-xs text-gray-500">Volume On-Balance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-1">Volume</p>
            <p className="text-xl font-bold text-white">{formatNumber(result.volume)}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-1">Rata-rata Turnover</p>
            <p className="text-xl font-bold text-white">{formatCurrency(result.turnover_avg)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Timeframe Summary */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Analisis Multi-Timeframe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mtfLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Menganalisis timeframe...
            </div>
          ) : Object.keys(mtfData).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 text-gray-500 font-medium">Timeframe</th>
                    <th className="text-center py-2 text-gray-500 font-medium">Tren</th>
                    <th className="text-center py-2 text-gray-500 font-medium">RSI</th>
                    <th className="text-center py-2 text-gray-500 font-medium">MACD</th>
                    <th className="text-center py-2 text-gray-500 font-medium">ROC</th>
                    <th className="text-center py-2 text-gray-500 font-medium">RVOL</th>
                  </tr>
                </thead>
                <tbody>
                  {['1D', '1W', '1M', '3M', '6M', '1Y'].map((tf) => {
                    const d = mtfData[tf];
                    if (!d) return null;
                    const isBullish = d.direction === 'bullish';
                    return (
                      <tr key={tf} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 font-medium text-white">{tf}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isBullish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isBullish ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                            {isBullish ? 'Bull' : 'Bear'}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`font-mono ${
                            d.rsi < 30 ? 'text-emerald-400' : d.rsi > 70 ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {d.rsi.toFixed(0)}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`font-mono ${d.macd > d.macd_signal ? 'text-emerald-400' : 'text-red-400'}`}>
                            {d.macd > d.macd_signal ? '+' : ''}{d.macd.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`font-mono ${d.roc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {d.roc >= 0 ? '+' : ''}{d.roc.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`font-mono ${d.rvol >= 1.5 ? 'text-cyan-400' : 'text-gray-400'}`}>
                            {d.rvol.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Minus className="w-2.5 h-2.5" /> RSI: &lt;30 oversold, &gt;70 overbought</span>
                <span className="flex items-center gap-1"><Minus className="w-2.5 h-2.5" /> MACD: di atas sinyal = bullish</span>
                <span className="flex items-center gap-1"><Minus className="w-2.5 h-2.5" /> RVOL: &gt;1.5x = aktivitas tinggi</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">Tidak ada data multi-timeframe</div>
          )}
        </CardContent>
      </Card>

      {/* Narrative Summary */}
      {narrative && narrative.length > 0 && (
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Kesimpulan Analisis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {narrative.map((section, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1 rounded-full shrink-0 bg-${section.color}-500`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{section.title}</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{section.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-4 italic">
              Narasi di atas dihasilkan secara otomatis berdasarkan data teknikal dan sentimen. Bukan rekomendasi trading.
            </p>
          </CardContent>
        </Card>
      )}

      {/* News */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-400" />
            Berita & Sentimen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newsLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Memuat berita...
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-2">
              {news.slice(0, 8).map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">{item.publisher}</span>
                      {item.publishedAt && (
                        <span className="text-[10px] text-gray-600">
                          {new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              <Newspaper className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              Tidak ada berita untuk {ticker}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
