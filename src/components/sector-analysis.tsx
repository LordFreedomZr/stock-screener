'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreeningResult } from '@/types';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SectorAnalysisProps {
  results: ScreeningResult[];
  onSectorClick?: (sector: string) => void;
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
  stocks: ScreeningResult[];
}

export function SectorAnalysis({ results, onSectorClick }: SectorAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

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

        return { name, count: stocks.length, bullish, bearish, avgScore, avgRsi, avgRvol, topStock, stocks: [...stocks].sort((a, b) => b.score - a.score) };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results]);

  const selectedSectorData = useMemo(() => {
    if (!selectedSector) return null;
    return sectorData.find((s) => s.name === selectedSector) || null;
  }, [sectorData, selectedSector]);

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
                  className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/80 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedSector(sector.name);
                    onSectorClick?.(sector.name);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{sector.name}</span>
                      <span className="text-xs text-gray-500">({sector.count})</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">Score {sector.avgScore.toFixed(1)}</span>
                  </div>

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

          {selectedSectorData && (
            <div className="mt-4 p-3 rounded-lg bg-gray-800/80 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  {selectedSectorData.name}
                  <span className="text-xs text-gray-500">({selectedSectorData.stocks.length} saham)</span>
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSector(null);
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {selectedSectorData.stocks.map((stock) => (
                  <a
                    key={stock.ticker}
                    href={`/stock/${stock.ticker}`}
                    className="flex items-center justify-between p-2 rounded-md bg-gray-900/50 hover:bg-gray-900/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="text-xs font-medium text-white">{stock.ticker}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[100px]">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-cyan-400">{formatCurrency(stock.price)}</p>
                      <p className={`text-[10px] ${stock.price_change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.price_change_percent >= 0 ? '+' : ''}{stock.price_change_percent.toFixed(2)}%
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
