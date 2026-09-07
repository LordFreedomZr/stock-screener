'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreeningResult } from '@/types';
import { formatCurrency, formatNumber, formatPercent, getScoreColor, getDirectionColor } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';

interface ScreeningCardProps {
  result: ScreeningResult;
}

export function ScreeningCard({ result }: ScreeningCardProps) {
  const isBullish = result.direction === 'bullish';

  return (
    <Link href={`/stock/${result.ticker}`}>
      <Card className="hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group">
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
                  <div 
                    className={`w-1.5 h-1.5 rounded-full ${result.dataSource === 'tradingview' ? 'bg-cyan-400' : 'bg-yellow-400'}`}
                    title={result.dataSource === 'tradingview' ? 'TradingView MCP' : 'Yahoo Finance'}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {formatCurrency(result.price)}
                </p>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Price Change
                </span>
                <span className={getDirectionColor(result.direction)}>
                  {formatPercent(result.price_change_percent)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Volume
                </span>
                <span className="text-white">
                  {formatNumber(result.volume)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">RSI</span>
                <span className="text-white">
                  {result.rsi.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">RVOL</span>
                <span className="text-white">
                  {result.rvol.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Max Profit</span>
              <span className="text-emerald-400">
                +{formatPercent(result.max_profit_percent)} ({formatCurrency(result.max_profit_nominal)})
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">Max Loss</span>
              <span className="text-red-400">
                {formatPercent(result.max_loss_percent)} ({formatCurrency(result.max_loss_nominal)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
