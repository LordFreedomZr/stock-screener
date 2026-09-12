'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreeningResult } from '@/types';
import { Bell, BellRing, AlertTriangle, TrendingDown, Volume2, ChevronDown, ChevronUp } from 'lucide-react';

interface AlertPanelProps {
  results: ScreeningResult[];
}

interface Alert {
  id: string;
  type: 'rsi_oversold' | 'rsi_overbought' | 'volume_spike' | 'big_drop';
  ticker: string;
  name: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  value: number;
}

export function AlertPanel({ results }: AlertPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const alerts = useMemo((): Alert[] => {
    const alertList: Alert[] = [];

    results.forEach((r) => {
      // RSI Oversold (< 30)
      if (r.rsi < 30) {
        alertList.push({
          id: `rsi-low-${r.ticker}`,
          type: 'rsi_oversold',
          ticker: r.ticker,
          name: r.name,
          message: `RSI oversold (${r.rsi}) - potensi bounce`,
          severity: r.rsi < 20 ? 'high' : 'medium',
          value: r.rsi,
        });
      }

      // RSI Overbought (> 70)
      if (r.rsi > 70) {
        alertList.push({
          id: `rsi-high-${r.ticker}`,
          type: 'rsi_overbought',
          ticker: r.ticker,
          name: r.name,
          message: `RSI overbought (${r.rsi}) - potensi koreksi`,
          severity: r.rsi > 80 ? 'high' : 'medium',
          value: r.rsi,
        });
      }

      // Volume Spike (> 2x average)
      if (r.rvol > 2) {
        alertList.push({
          id: `vol-${r.ticker}`,
          type: 'volume_spike',
          ticker: r.ticker,
          name: r.name,
          message: `Volume spike ${r.rvol}x rata-rata`,
          severity: r.rvol > 3 ? 'high' : 'medium',
          value: r.rvol,
        });
      }

      // Big Drop (> -5%)
      if (r.price_change_percent < -5) {
        alertList.push({
          id: `drop-${r.ticker}`,
          type: 'big_drop',
          ticker: r.ticker,
          name: r.name,
          message: `Turun ${r.price_change_percent.toFixed(1)}% hari ini`,
          severity: r.price_change_percent < -7 ? 'high' : 'medium',
          value: r.price_change_percent,
        });
      }
    });

    return alertList.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [results]);

  if (alerts.length === 0) return null;

  const highAlerts = alerts.filter((a) => a.severity === 'high');
  const mediumAlerts = alerts.filter((a) => a.severity === 'medium');

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {highAlerts.length > 0 ? (
              <BellRing className="w-4 h-4 text-yellow-400" />
            ) : (
              <Bell className="w-4 h-4 text-gray-400" />
            )}
            Alert Harga
            <span className="text-xs text-gray-500 font-normal">
              ({alerts.length} aktif)
            </span>
            {highAlerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                {highAlerts.length} urgent
              </span>
            )}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  alert.severity === 'high'
                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-gray-800/50'
                }`}
              >
                <div className="shrink-0">
                  {alert.type === 'rsi_oversold' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                  {alert.type === 'rsi_overbought' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                  {alert.type === 'volume_spike' && <Volume2 className="w-4 h-4 text-cyan-400" />}
                  {alert.type === 'big_drop' && <TrendingDown className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{alert.ticker}</span>
                    <span className="text-xs text-gray-500 truncate">{alert.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
