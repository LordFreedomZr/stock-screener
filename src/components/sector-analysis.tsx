'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreeningResult } from '@/types';
import { BarChart3, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectorAnalysisProps {
  results: ScreeningResult[];
  selectedSector: string;
  onSectorSelect: (sector: string) => void;
}

export function SectorAnalysis({ results, selectedSector, onSectorSelect }: SectorAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  const sectorStats = useMemo(() => {
    const map = new Map<string, { count: number; bullish: number; bearish: number; avgScore: number }>();

    results.forEach((r) => {
      const sector = r.sector || 'Unknown';
      if (!map.has(sector)) map.set(sector, { count: 0, bullish: 0, bearish: 0, avgScore: 0 });
      const s = map.get(sector)!;
      s.count++;
      if (r.direction === 'bullish') s.bullish++;
      if (r.direction === 'bearish') s.bearish++;
      s.avgScore += r.score;
    });

    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        ...s,
        avgScore: s.avgScore / s.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results]);

  const SHOW_LIMIT = 6;
  const visibleSectors = expanded ? sectorStats : sectorStats.slice(0, SHOW_LIMIT);
  const hasMore = sectorStats.length > SHOW_LIMIT;

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Sector
          </CardTitle>
          {selectedSector && (
            <button
              onClick={() => onSectorSelect('')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        <div className="flex flex-wrap gap-1.5">
          {visibleSectors.map((s) => {
            const isActive = selectedSector === s.name;
            const bullishPercent = s.count > 0 ? (s.bullish / s.count) * 100 : 0;
            return (
              <button
                key={s.name}
                onClick={() => onSectorSelect(isActive ? '' : s.name)}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-lg border transition-all text-left',
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[10px] opacity-60">({s.count})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-70">
                  <span className="text-emerald-400">{s.bullish}↑</span>
                  <span className="text-red-400">{s.bearish}↓</span>
                  <span>{s.avgScore.toFixed(0)}</span>
                </div>
              </button>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-700/50 bg-gray-800/50 text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              {expanded ? (
                <>Less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>+{sectorStats.length - SHOW_LIMIT} lagi <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
