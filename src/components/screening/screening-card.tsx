'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreeningResult } from '@/types';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  getScoreColor,
} from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3, Activity, Star } from 'lucide-react';

interface ScreeningCardProps {
  result: ScreeningResult;
  density?: 'compact' | 'comfortable';
}

export function ScreeningCard({ result, density = 'compact' }: ScreeningCardProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const isBullish = result.direction === 'bullish';
  const compact = density === 'compact';

  const getRsiColor = (rsi: number) => {
    if (rsi < 30) return 'text-emerald-400';
    if (rsi > 70) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getVolumeColor = (rvol: number) => {
    if (rvol >= 2) return 'text-emerald-400';
    if (rvol >= 1) return 'text-cyan-400';
    return 'text-red-400';
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
      const payload: Record<string, unknown> = { ticker: result.ticker, action };
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
      <Card className={`hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group relative h-full ${compact ? '' : 'border-gray-700/50'}`}>
        <CardHeader className={compact ? 'pb-2 p-3' : 'pb-3 p-4'}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20 shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
                <span className={`font-bold text-cyan-400 ${compact ? 'text-xs' : 'text-sm'}`}>{result.ticker.slice(0, 2)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-white group-hover:text-cyan-400 transition-colors leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                    {result.ticker}
                  </span>
                  <button
                    onClick={handleQuickAdd}
                    disabled={saving}
                    className="p-0.5 text-gray-500 hover:text-yellow-400 transition-colors shrink-0"
                  >
                    <Star className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${saved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </button>
                </div>
                <p className={`text-gray-500 leading-tight ${compact ? 'text-[11px]' : 'text-sm'}`}>{formatCurrency(result.price)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`font-bold leading-tight ${getScoreColor(result.score)} ${compact ? 'text-xl' : 'text-2xl'}`}>
                {result.score}
              </div>
              <Badge variant={isBullish ? 'success' : 'destructive'} className={`${compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}>
                {isBullish ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                {result.direction}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className={compact ? 'pt-0 px-3 pb-3' : 'pt-0 px-4 pb-4'}>
          <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500 flex items-center gap-1.5">
                <Activity className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                Chg
              </span>
              <span className={`font-medium ${getPriceChangeColor(result.price_change_percent)}`}>
                {formatPercent(result.price_change_percent)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">RSI</span>
              <span className={`font-medium ${getRsiColor(result.rsi)}`}>
                {result.rsi.toFixed(1)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500 flex items-center gap-1.5">
                <BarChart3 className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                Vol
              </span>
              <span className={`font-medium ${getVolumeColor(result.rvol)}`}>
                {formatNumber(result.volume)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">RVOL</span>
              <span className={`font-medium ${getVolumeColor(result.rvol)}`}>
                {result.rvol.toFixed(2)}x
              </span>
            </div>
          </div>
          <div className={`border-t border-gray-800/50 space-y-1 ${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">Max Profit</span>
              <span className="text-emerald-400 font-medium">
                +{formatPercent(result.max_profit_percent)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">Max Loss</span>
              <span className="text-red-400 font-medium">
                {formatPercent(result.max_loss_percent)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
