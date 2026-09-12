'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreeningResult } from '@/types';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';

interface SectorAnalysisProps {
  results: ScreeningResult[];
}

interface SectorData {
  name: string;
  count: number;
  bullish: number;
  bearish: number;
  avgScore: number;
  avgRsi: number;
  avgRvol: number;
  topStock: ScreeningResult;
}

export function SectorAnalysis({ results }: SectorAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  const sectorData = useMemo((): SectorData[] => {
    const sectorMap = new Map<string, ScreeningResult[]>();

    results.forEach((r) => {
      const sector = r.sector || 'Unknown';
      if (!sectorMap.has(sector)) sectorMap.set(sector, []);
      sectorMap.get(sector)!.push(r);
    });

    return Array.from(sectorMap.entries())
      .map(([name, stocks]) => {
        const bullish = stocks.filter((s) => s.direction === 'bullish').length;
        const bearish = stocks.filter((s) => s.direction === 'bearish').length;
        const avgScore = stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length;
        const avgRsi = stocks.reduce((sum, s) => sum + s.rsi, 0) / stocks.length;
        const avgRvol = stocks.reduce((sum, s) => sum + s.rvol, 0) / stocks.length;
        const topStock = [...stocks].sort((a, b) => b.score - a.score)[0];

        return { name, count: stocks.length, bullish, bearish, avgScore, avgRsi, avgRvol, topStock };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results]);

  if (sectorData.length === 0) return null;

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Sector Analysis
            <span className="text-xs text-gray-500 font-normal">({sectorData.length} sektor)</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sectorData.map((sector) => {
              const bullishPercent = sector.count > 0 ? (sector.bullish / sector.count) * 100 : 0;
              return (
                <div
                  key={sector.name}
                  className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{sector.name}</span>
                      <span className="text-xs text-gray-500">({sector.count})</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">Score {sector.avgScore.toFixed(1)}</span>
                  </div>

                  {/* Bullish/Bearish bar */}
                  <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${bullishPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        {sector.bullish}
                      </span>
                      <span className="flex items-center gap-1 text-red-400">
                        <TrendingDown className="w-3 h-3" />
                        {sector.bearish}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span>RSI {sector.avgRsi.toFixed(0)}</span>
                      <span>RVOL {sector.avgRvol.toFixed(1)}x</span>
                    </div>
                    <span className="text-gray-400">
                      Top: <span className="text-white">{sector.topStock.ticker}</span> ({sector.topStock.score})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
