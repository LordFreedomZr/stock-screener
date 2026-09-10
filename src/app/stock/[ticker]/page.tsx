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
  Zap, Target, Shield, Clock, RefreshCw, LineChart 
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
  const abortControllerRef = useRef<AbortController | null>(null);

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
      // Fetch screening data for this ticker
      const screeningResponse = await fetch('/api/screening', {
        signal: abortControllerRef.current.signal,
      });
      const screeningData = await screeningResponse.json();
      
      if (screeningData.success && screeningData.data) {
        const stockData = screeningData.data.find((s: any) => s.ticker === ticker);
        if (stockData) {
          setResult(stockData as ScreeningResult);
        }
      }

      // Fetch price history for chart
      const historyResponse = await fetch(`/api/history/${encodeURIComponent(ticker)}`, {
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
          const inWatchlist = data.data.some((item: any) => item.ticker === ticker && item.status === 'active');
          setIsInWatchlist(inWatchlist);
        }
      } catch (error) {
        console.error('Error checking watchlist:', error);
      }
    };
    
    checkWatchlist();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, ticker]);

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
        <h2 className="text-xl font-bold text-white mb-2">Stock Not Found</h2>
        <p className="text-gray-500 mb-4">No screening data available for {ticker}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
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
              Real-time data
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
            {watchlistLoading ? 'Loading...' : isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Current Price</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(result.price)}</p>
            <p className={getDirectionColor(result.direction)}>
              {formatPercent(result.price_change_percent)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Score</p>
            <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}
            </p>
            <p className="text-xs text-gray-500">out of 5</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Max Profit</p>
            <p className="text-2xl font-bold text-emerald-400">
              +{formatPercent(result.max_profit_percent)}
            </p>
            <p className="text-xs text-gray-500">{formatCurrency(result.max_profit_nominal)}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Max Loss</p>
            <p className="text-2xl font-bold text-red-400">
              {formatPercent(result.max_loss_percent)}
            </p>
            <p className="text-xs text-gray-500">{formatCurrency(result.max_loss_nominal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Price Chart (3 Months)
          </CardTitle>
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
                Loading RSI data...
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
                Loading MACD data...
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
              {result.rsi < 30 ? 'Oversold' : result.rsi > 70 ? 'Overbought' : 'Neutral'}
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
              Signal: {result.macd_signal.toFixed(2)}
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
            <p className="text-xs text-gray-500">Rate of Change</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-500">RVOL</span>
            </div>
            <p className="text-xl font-bold text-white">{result.rvol.toFixed(2)}x</p>
            <p className="text-xs text-gray-500">Relative Volume</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-500">ATR%</span>
            </div>
            <p className="text-xl font-bold text-white">{result.atr_percent.toFixed(2)}%</p>
            <p className="text-xs text-gray-500">Volatility</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-500">OBV</span>
            </div>
            <p className="text-xl font-bold text-white">{formatNumber(result.obv)}</p>
            <p className="text-xs text-gray-500">On-Balance Volume</p>
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
            <p className="text-sm text-gray-500 mb-1">Avg Turnover</p>
            <p className="text-xl font-bold text-white">{formatCurrency(result.turnover_avg)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
