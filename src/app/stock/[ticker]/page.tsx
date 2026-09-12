'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  CheckCircle, AlertTriangle, Minus
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

  const fetchData = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setFetching(true);
    try {
      // Get enabled indicators from localStorage
      const savedEnabled = localStorage.getItem('enabled_indicators');
      const enabledIndicators = savedEnabled ? JSON.parse(savedEnabled) : ['rsi', 'macd', 'roc', 'rvol', 'atr'];
      
      const params = new URLSearchParams();
      if (enabledIndicators.length > 0) {
        params.set('enabled', enabledIndicators.join(','));
      }

      // Fetch screening data for this ticker
      let found = false;
      const screeningResponse = await fetch(`/api/screening?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });
      const screeningData = await screeningResponse.json();
      
      if (screeningData.success && screeningData.data) {
        const stockData = screeningData.data.find((s: any) => s.ticker === ticker);
        if (stockData) {
          setResult(stockData as ScreeningResult);
          found = true;
        }
      }

      // If not found in top 150, fetch directly
      if (!found) {
        const stockResponse = await fetch(`/api/stock/${encodeURIComponent(ticker)}?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });
        const stockJson = await stockResponse.json();
        if (stockJson.success && stockJson.data) {
          setResult(stockJson.data as ScreeningResult);
        }
      }

      // Fetch price history for chart
      const historyResponse = await fetch(`/api/history/${encodeURIComponent(ticker)}?range=${timeframe.range}&interval=${timeframe.interval}`, {
        signal: abortControllerRef.current.signal,
      });
      const historyData = await historyResponse.json();
      
      if (historyData.success && historyData.data) {
        setPriceData(historyData.data as PriceSnapshot[]);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchData();
    
    // Check if stock is in watchlist
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

    // Fetch news
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

    // Fetch multi-timeframe data
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

        const results: Record<string, { rsi: number; macd: number; macd_signal: number; roc: number; rvol: number; direction: string }> = {};

        for (const tf of timeframes) {
          try {
            const res = await fetch(`/api/history/${encodeURIComponent(ticker)}?range=${tf.range}&interval=${tf.interval}`);
            const data = await res.json();
            if (data.success && data.data && data.data.length > 20) {
              const closes = data.data.map((d: { close: number }) => d.close);
              const volumes = data.data.map((d: { volume: number }) => d.volume);

              // RSI
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

              // MACD
              const k12 = 2 / 13, k26 = 2 / 27;
              let ema12 = closes[0], ema26 = closes[0];
              for (let i = 1; i < closes.length; i++) {
                ema12 = closes[i] * k12 + ema12 * (1 - k12);
                ema26 = closes[i] * k26 + ema26 * (1 - k26);
              }
              const macdLine = ema12 - ema26;
              const signalLine = macdLine * (2 / 10); // approx

              // ROC (10-period)
              const roc = closes.length > 10
                ? ((closes[closes.length - 1] - closes[closes.length - 11]) / closes[closes.length - 11]) * 100
                : 0;

              // RVOL
              const avgVol = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
              const rvol = avgVol > 0 ? volumes[volumes.length - 1] / avgVol : 1;

              // Direction
              const momentumScore = (rsi > 50 ? 0.5 : -0.5) + (macdLine > signalLine ? 0.3 : -0.3) + (roc > 0 ? 0.2 : -0.2);
              const direction = momentumScore > 0 ? 'bullish' : 'bearish';

              results[tf.label] = { rsi, macd: macdLine, macd_signal: signalLine, roc, rvol, direction };
            }
          } catch {}
        }

        setMtfData(results);
      } catch {}
      setMtfLoading(false);
    };

    checkWatchlist();
    fetchNews();
    fetchMTF();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, ticker, timeframe]);

  const toggleWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const action = isInWatchlist ? 'stop' : 'add';
      const payload: any = { ticker, action };
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

  const isBullish = result.direction === 'bullish';

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
            onClick={fetchData}
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
