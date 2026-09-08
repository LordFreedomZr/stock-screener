'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WatchlistItem } from '@/types';
import {
  formatDate,
  getScoreColor,
  getStatusColor,
  getDirectionColor,
  formatPercent,
  formatCurrency,
} from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Zap,
  HelpCircle,
} from 'lucide-react';

interface WatchlistCardProps {
  item: WatchlistItem;
  onStop?: (ticker: string) => void;
  onEvaluate?: (ticker: string) => void;
}

export function WatchlistCard({ item, onStop, onEvaluate }: WatchlistCardProps) {
  const evaluation = item.latest_evaluation;
  const isActive = item.status === 'active';

  const entryPrice =
    item.entry_price ||
    evaluation?.entry_price ||
    (evaluation && evaluation.current_price - evaluation.price_movement_nominal);

  return (
    <Card
      className={`transition-all duration-300 ${
        isActive
          ? 'hover:border-cyan-500/50'
          : 'opacity-50 grayscale border-gray-800/30 bg-gray-900/30'
      }`}
    >
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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Masuk: {formatDate(item.marked_at)}</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Aktif' : 'Dihentikan'}
            </Badge>
            {isActive && onEvaluate && (
              <Button
                variant="ghost"
                size="sm"
                title="Evaluasi saham ini"
                onClick={() => onEvaluate(item.ticker)}
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 w-8 p-0"
              >
                <Zap className="w-4 h-4" />
              </Button>
            )}
            {isActive && onStop && (
              <Button
                variant="ghost"
                size="sm"
                title="Hentikan pemantauan"
                onClick={() => onStop(item.ticker)}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
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
            {/* Status Evaluasi */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Status Akurasi</span>
              <Badge className={getStatusColor(evaluation.status)}>
                {evaluation.status === 'benar' && <CheckCircle className="w-3 h-3 mr-1" />}
                {evaluation.status === 'floating' && <HelpCircle className="w-3 h-3 mr-1" />}
                {evaluation.status === 'meleset' && <XCircle className="w-3 h-3 mr-1" />}
                {evaluation.status === 'benar'
                  ? 'Prediksi Benar'
                  : evaluation.status === 'floating'
                  ? 'Floating'
                  : 'Meleset'}
              </Badge>
            </div>

            {/* Matrix Harga & Pergerakan */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-gray-950/40 border border-gray-800/60 text-xs">
              <div>
                <span className="text-gray-500 block mb-0.5">Harga Entry</span>
                <p className="text-gray-200 font-medium">
                  {entryPrice && entryPrice > 0 ? formatCurrency(entryPrice) : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Harga Terkini</span>
                <p className="text-white font-semibold">{formatCurrency(evaluation.current_price)}</p>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Sinyal / Skor</span>
                <p className="font-semibold flex items-center gap-1">
                  <span className={getDirectionColor(evaluation.analysis_direction)}>
                    {evaluation.analysis_direction === 'bullish' ? 'Bullish' : 'Bearish'}
                  </span>
                  <span className={getScoreColor(evaluation.analysis_score)}>
                    ({evaluation.analysis_score}/5)
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Perubahan Harga</span>
                <p
                  className={`font-semibold flex items-center gap-1 ${
                    evaluation.price_movement_percent >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {evaluation.price_movement_percent >= 0 ? (
                    <TrendingUp className="w-3 h-3 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 inline" />
                  )}
                  <span>
                    {formatPercent(evaluation.price_movement_percent)} (
                    {formatCurrency(evaluation.price_movement_nominal)})
                  </span>
                </p>
              </div>
            </div>

            {/* Notes / Footer */}
            {evaluation.notes && (
              <p className="text-[11px] text-gray-400 italic bg-gray-900/60 p-2 rounded border border-gray-800/40">
                {evaluation.notes}
              </p>
            )}

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
              <span>Terakhir Dievaluasi</span>
              <span>{formatDate(evaluation.timestamp)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto opacity-50 text-cyan-400" />
            <p className="text-xs">Belum ada hasil evaluasi</p>
            {onEvaluate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEvaluate(item.ticker)}
                className="text-xs text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <Zap className="w-3 h-3 mr-1" />
                Evaluasi Sekarang
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
