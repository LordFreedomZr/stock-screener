'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreeningResult } from '@/types';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  getScoreColor,
  getDirectionColor,
} from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3, Activity, Star } from 'lucide-react';

interface ScreeningCardProps {
  result: ScreeningResult;
}

export function ScreeningCard({ result }: ScreeningCardProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const isBullish = result.direction === 'bullish';

  // Color helpers
  const getRsiColor = (rsi: number) => {
    if (rsi < 30) return 'text-emerald-400'; // Oversold = bullish signal
    if (rsi > 70) return 'text-red-400'; // Overbought = bearish signal
    return 'text-yellow-400'; // Neutral
  };

  const getVolumeColor = (rvol: number) => {
    if (rvol >= 2) return 'text-emerald-400'; // High volume = strong interest
    if (rvol >= 1) return 'text-cyan-400'; // Normal volume
    return 'text-red-400'; // Low volume = weak interest
  };

  const getPriceChangeColor = (percent: number) => {
    if (percent > 0) return 'text-emerald-400';
    if (percent < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;

    setSaving(true);
    try {
      const action = saved ? 'stop' : 'add';
      const payload: any = { ticker: result.ticker, action };
      if (action === 'add') {
        payload.price = result.price;
        payload.score = result.score;
        payload.direction = result.direction;
      }

      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(!saved);
      }
    } catch (err) {
      console.error('Error in quick add to watchlist:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Link href={`/stock/${result.ticker}`}>
      <Card className="hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
                <span className="text-sm font-bold text-cyan-400">{result.ticker.slice(0, 2)}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg group-hover:text-cyan-400 transition-colors">
                    {result.ticker}
                  </CardTitle>
                  <button
                    onClick={handleQuickAdd}
                    disabled={saving}
                    title={saved ? 'Tersimpan di Watchlist' : 'Tambah ke Watchlist'}
                    className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        saved ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/40'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-500">{formatCurrency(result.price)}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
              </div>
              <Badge variant={isBullish ? 'success' : 'destructive'}>
                {isBullish ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {result.direction}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Price Change
                </span>
                <span className={getPriceChangeColor(result.price_change_percent)}>
                  {formatPercent(result.price_change_percent)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3" />
                  Volume
                </span>
                <span className={`font-medium ${getVolumeColor(result.rvol)}`}>
                  {formatNumber(result.volume)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">RSI</span>
                <span className={`font-medium ${getRsiColor(result.rsi)}`}>
                  {result.rsi.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">RVOL</span>
                <span className={`font-medium ${getVolumeColor(result.rvol)}`}>
                  {result.rvol.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Max Profit</span>
              <span className="text-emerald-400 font-medium">
                +{formatPercent(result.max_profit_percent)} ({formatCurrency(result.max_profit_nominal)})
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Max Loss</span>
              <span className="text-red-400 font-medium">
                {formatPercent(result.max_loss_percent)} ({formatCurrency(result.max_loss_nominal)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
