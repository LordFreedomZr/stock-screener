'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WatchlistItem } from '@/types';
import { formatDate, getScoreColor, getStatusColor, getDirectionColor, formatPercent, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Pause, History } from 'lucide-react';

interface WatchlistCardProps {
  item: WatchlistItem;
  onStop?: (ticker: string) => void;
}

export function WatchlistCard({ item, onStop }: WatchlistCardProps) {
  const evaluation = item.latest_evaluation;
  const isActive = item.status === 'active';

  return (
    <Card className={`hover:border-cyan-500/50 transition-all duration-300 ${!isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Link href={`/stock/${item.ticker}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
              <span className="text-sm font-bold text-cyan-400">{item.ticker.slice(0, 2)}</span>
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-cyan-400 transition-colors">
                {item.ticker}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDate(item.marked_at)}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Stopped'}
            </Badge>
            {isActive && onStop && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStop(item.ticker)}
                className="text-gray-400 hover:text-red-400"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {evaluation ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Latest Status</span>
              <Badge className={getStatusColor(evaluation.status)}>
                {evaluation.status === 'benar' && <CheckCircle className="w-3 h-3 mr-1" />}
                {evaluation.status === 'meleset' && <XCircle className="w-3 h-3 mr-1" />}
                {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Price</span>
                <p className="text-white font-medium">{formatCurrency(evaluation.current_price)}</p>
              </div>
              <div>
                <span className="text-gray-500">Movement</span>
                <p className={getDirectionColor(evaluation.analysis_direction)}>
                  {formatPercent(evaluation.price_movement_percent)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Analysis Score</span>
                <p className={getScoreColor(evaluation.analysis_score)}>
                  {evaluation.analysis_score}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Direction</span>
                <p className={getDirectionColor(evaluation.analysis_direction)}>
                  {evaluation.analysis_direction === 'bullish' ? (
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 inline mr-1" />
                  )}
                  {evaluation.analysis_direction}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last Evaluated</span>
                <span className="text-gray-400">{formatDate(evaluation.timestamp)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for first evaluation...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
