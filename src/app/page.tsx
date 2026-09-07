'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScreeningCard } from '@/components/screening/screening-card';
import { FilterPanel } from '@/components/screening/filter-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterState, ScreeningResult } from '@/types';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, Clock, Zap, Flame, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

export default function DashboardPage() {
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    priceMin: null,
    priceMax: null,
    volumeMin: null,
    maxLossPercent: null,
    maxLossNominal: null,
    maxProfitPercent: null,
    maxProfitNominal: null,
  });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchScreeningResults = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch('/api/screening');
      const data = await response.json();
      
      if (data.success && data.data) {
        setResults(data.data);
        setLastUpdate(new Date());
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching screening results:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchScreeningResults();
  }, [fetchScreeningResults]);

  const filteredResults = useMemo(() => results.filter((result) => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTicker = result.ticker.toLowerCase().includes(query);
      const matchesName = result.name?.toLowerCase().includes(query);
      if (!matchesTicker && !matchesName) return false;
    }
    // Other filters
    if (filters.priceMin !== null && result.price < filters.priceMin) return false;
    if (filters.priceMax !== null && result.price > filters.priceMax) return false;
    if (filters.volumeMin !== null && result.volume < filters.volumeMin) return false;
    if (filters.maxLossPercent !== null && result.max_loss_percent > filters.maxLossPercent) return false;
    if (filters.maxLossNominal !== null && result.max_loss_nominal > filters.maxLossNominal) return false;
    if (filters.maxProfitPercent !== null && result.max_profit_percent < filters.maxProfitPercent) return false;
    if (filters.maxProfitNominal !== null && result.max_profit_nominal < filters.maxProfitNominal) return false;
    return true;
  }), [results, filters]);

  // Volume spike rankings
  const volumeRankings = useMemo(() => {
    const withSpikes = results
      .filter(r => r.volume_spike)
      .map(r => ({
        ...r,
        spikeYesterday: r.volume_spike?.yesterday ?? 0,
        spike3d: r.volume_spike?.avg_3d ?? 0,
        spike5d: r.volume_spike?.avg_5d ?? 0,
      })) as (ScreeningResult & { spikeYesterday: number; spike3d: number; spike5d: number })[];

    const topYesterday = [...withSpikes]
      .sort((a, b) => b.spikeYesterday - a.spikeYesterday)
      .slice(0, 10);

    const top3d = [...withSpikes]
      .sort((a, b) => b.spike3d - a.spike3d)
      .slice(0, 10);

    const top5d = [...withSpikes]
      .sort((a, b) => b.spike5d - a.spike5d)
      .slice(0, 10);

    return { topYesterday, top3d, top5d };
  }, [results]);

  const bullishCount = filteredResults.filter((r) => r.direction === 'bullish').length;
  const bearishCount = filteredResults.filter((r) => r.direction === 'bearish').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Screener</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4" />
            {lastUpdate ? `Last updated: ${formatDate(lastUpdate)}` : 'Loading...'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchScreeningResults}
          disabled={fetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
          {fetching ? 'Fetching...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{filteredResults.length}</p>
                <p className="text-xs text-gray-500">Total Stocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{bullishCount}</p>
                <p className="text-xs text-gray-500">Bullish</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{bearishCount}</p>
                <p className="text-xs text-gray-500">Bearish</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <FilterPanel filters={filters} onFiltersChange={setFilters} />

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <Zap className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volume Spike Rankings */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Volume Spike Rankings (Top 10)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vs Yesterday */}
            <VolumeRankingCard
              title="Vs Yesterday"
              subtitle="Perbandingan volume hari ini vs kemarin"
              data={volumeRankings.topYesterday}
              getValue={(r) => r.spikeYesterday}
              color="orange"
            />

            {/* Vs 3-Day Average */}
            <VolumeRankingCard
              title="Vs 3-Day Avg"
              subtitle="Perbandingan volume hari ini vs rata-rata 3 hari"
              data={volumeRankings.top3d}
              getValue={(r) => r.spike3d}
              color="cyan"
            />

            {/* Vs 5-Day Average */}
            <VolumeRankingCard
              title="Vs 5-Day Avg"
              subtitle="Perbandingan volume hari ini vs rata-rata 5 hari"
              data={volumeRankings.top5d}
              getValue={(r) => r.spike5d}
              color="purple"
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-gray-800/50 bg-gray-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-2">No Results Found</h3>
            <p className="text-gray-500">
              {results.length === 0
                ? 'No screening results available yet. Click Refresh to fetch data.'
                : 'No stocks match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResults.map((result) => (
            <ScreeningCard key={result.ticker} result={result} />
          ))}
        </div>
      )}

      {/* Data Source Info */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500 text-center">
            Data source: Yahoo Finance | 40+ IDX stocks | Real-time quotes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

type RankingItem = ScreeningResult & { spikeYesterday: number; spike3d: number; spike5d: number };

function VolumeRankingCard({
  title,
  subtitle,
  data,
  getValue,
  color,
}: {
  title: string;
  subtitle: string;
  data: RankingItem[];
  getValue: (r: RankingItem) => number;
  color: 'orange' | 'cyan' | 'purple';
}) {
  const colorClasses = {
    orange: {
      border: 'border-orange-500/30',
      bg: 'bg-orange-500/5',
      text: 'text-orange-400',
      badge: 'bg-orange-500/20 text-orange-400',
      icon: 'bg-orange-500/10',
    },
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/5',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-400',
      icon: 'bg-cyan-500/10',
    },
    purple: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/5',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-400',
      icon: 'bg-purple-500/10',
    },
  };

  const classes = colorClasses[color];

  return (
    <Card className={`${classes.border} ${classes.bg} backdrop-blur-xl`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-semibold ${classes.text}`}>{title}</CardTitle>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">No data</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {data.map((item, idx) => {
              const value = getValue(item);
              return (
                <div key={item.ticker} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800/30 transition-colors">
                  <div className={`w-6 h-6 rounded-full ${classes.icon} flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${classes.text}`}>{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.ticker}</p>
                    <p className="text-xs text-gray-500 truncate">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${classes.text}`}>
                      {value > 0 ? '+' : ''}{value}%
                    </p>
                    <p className="text-xs text-gray-500">{formatNumber(item.volume)} lot</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
