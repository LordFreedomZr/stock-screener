'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScreeningResult } from '@/types';
import { formatCurrency, formatPercent, getScoreColor, getDirectionColor } from '@/lib/utils';
import { Plus, X, BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function ComparePage() {
  const [tickers, setTickers] = useState<string[]>(['', '']);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStock = async (ticker: string): Promise<ScreeningResult | null> => {
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(ticker)}`);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  const handleCompare = useCallback(async () => {
    const validTickers = tickers.filter((t) => t.trim().length > 0);
    if (validTickers.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(validTickers.map((t) => fetchStock(t.trim().toUpperCase())));
      setResults(results.filter(Boolean) as ScreeningResult[]);
    } finally {
      setLoading(false);
    }
  }, [tickers]);

  const addTicker = () => {
    if (tickers.length < 4) setTickers([...tickers, '']);
  };

  const removeTicker = (index: number) => {
    if (tickers.length > 2) {
      setTickers(tickers.filter((_, i) => i !== index));
      setResults(results.filter((_, i) => i !== index));
    }
  };

  const updateTicker = (index: number, value: string) => {
    const newTickers = [...tickers];
    newTickers[index] = value.toUpperCase();
    setTickers(newTickers);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compare Stocks</h1>
        <p className="text-gray-500 text-sm mt-1">Bandingkan hingga 4 saham secara side-by-side</p>
      </div>

      {/* Ticker Input */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardContent className="p-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex gap-2 flex-wrap">
              {tickers.map((ticker, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    type="text"
                    placeholder={`Ticker ${i + 1}`}
                    value={ticker}
                    onChange={(e) => updateTicker(i, e.target.value)}
                    className="h-9 w-28 text-xs uppercase"
                    maxLength={10}
                  />
                  {tickers.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTicker(i)}
                      className="h-9 w-9 p-0 text-gray-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {tickers.length < 4 && (
                <Button variant="outline" size="sm" onClick={addTicker} className="h-9">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={handleCompare}
                disabled={loading || tickers.every((t) => !t.trim())}
                className="bg-cyan-500 hover:bg-cyan-600 text-gray-950 h-9"
              >
                {loading ? 'Loading...' : 'Compare'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-3 px-4 text-left text-gray-500 font-medium">Metric</th>
                {results.map((r) => (
                  <th key={r.ticker} className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-bold">{r.ticker}</span>
                      <span className="text-gray-500 text-xs truncate max-w-[120px]">{r.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">Score</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center">
                    <span className={`font-bold ${getScoreColor(r.score)}`}>{r.score}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">Direction</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center">
                    <span className={`flex items-center justify-center gap-1 ${getDirectionColor(r.direction)}`}>
                      {r.direction === 'bullish' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {r.direction}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">Price</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-white">{formatCurrency(r.price)}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">Change</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center">
                    <span className={r.price_change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatPercent(r.price_change_percent)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">RSI (14)</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-white">{r.rsi}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">RVOL</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-white">{r.rvol}x</td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">ATR %</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-white">{r.atr_percent}%</td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400">Volume</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-white">{(r.volume / 1e6).toFixed(1)}M</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-400">Sector</td>
                {results.map((r) => (
                  <td key={r.ticker} className="py-3 px-4 text-center text-gray-400 text-xs">{r.sector}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !loading && (
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-2">Masukkan Ticker</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Masukkan 2-4 ticker saham untuk membandingkan indikator dan performanya.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
