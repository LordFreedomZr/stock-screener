'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScreeningCard } from '@/components/screening/screening-card';
import { FilterPanel } from '@/components/screening/filter-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterState, ScreeningResult } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, Clock, Zap, Flame, ChevronDown, ChevronUp } from 'lucide-react';

type SpikeTab = 'yesterday' | '3d' | '5d';

interface DataSourceInfo {
  primary: 'tradingview' | 'yahoo';
  tradingview: number;
  yahoo: number;
}

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
  const [spikeTab, setSpikeTab] = useState<SpikeTab>('yesterday');
  const [spikeExpanded, setSpikeExpanded] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);

  const fetchScreeningResults = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch('/api/screening');
      const data = await response.json();
      
      if (data.success && data.data) {
        setResults(data.data);
        setLastUpdate(new Date());
        if (data.dataSource) {
          setDataSource(data.dataSource);
        }
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
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTicker = result.ticker.toLowerCase().includes(query);
      const matchesName = result.name?.toLowerCase().includes(query);
      if (!matchesTicker && !matchesName) return false;
    }
    if (filters.priceMin !== null && result.price < filters.priceMin) return false;
    if (filters.priceMax !== null && result.price > filters.priceMax) return false;
    if (filters.volumeMin !== null && result.volume < filters.volumeMin) return false;
    if (filters.maxLossPercent !== null && result.max_loss_percent > filters.maxLossPercent) return false;
    if (filters.maxLossNominal !== null && result.max_loss_nominal > filters.maxLossNominal) return false;
    if (filters.maxProfitPercent !== null && result.max_profit_percent < filters.maxProfitPercent) return false;
    if (filters.maxProfitNominal !== null && result.max_profit_nominal < filters.maxProfitNominal) return false;
    return true;
  }), [results, filters]);

  const volumeRanking = useMemo(() => {
    const withSpikes = results
      .filter(r => r.volume_spike)
      .map(r => ({
        ...r,
        spike: spikeTab === 'yesterday'
          ? (r.volume_spike?.yesterday ?? 0)
          : spikeTab === '3d'
          ? (r.volume_spike?.avg_3d ?? 0)
          : (r.volume_spike?.avg_5d ?? 0),
      }));

    return [...withSpikes]
      .sort((a, b) => b.spike - a.spike)
      .slice(0, 10);
  }, [results, spikeTab]);

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

      {/* Volume Spike — Mobile: collapsible card, Desktop: always visible */}
      {!loading && results.length > 0 && (
        <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl lg:hidden">
          <CardHeader
            className="pb-2 cursor-pointer select-none"
            onClick={() => setSpikeExpanded(!spikeExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Volume Spike Top 10
              </CardTitle>
              {spikeExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
          {spikeExpanded && (
            <CardContent className="p-0">
              <SpikeContent
                spikeTab={spikeTab}
                setSpikeTab={setSpikeTab}
                volumeRanking={volumeRanking}
                loading={loading}
              />
            </CardContent>
          )}
        </Card>
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
        <div className="flex gap-6">
          {/* Stock Cards */}
          <div className="flex-1 min-w-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredResults.map((result) => (
                <ScreeningCard key={result.ticker} result={result} />
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0">
            <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Volume Spike Top 10
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SpikeContent
                  spikeTab={spikeTab}
                  setSpikeTab={setSpikeTab}
                  volumeRanking={volumeRanking}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {/* Data Source Info */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dataSource?.primary === 'tradingview' ? 'bg-cyan-400' : 'bg-yellow-400'}`} />
              <span>
                Data source: {dataSource?.primary === 'tradingview' ? 'TradingView MCP' : 'Yahoo Finance'}
              </span>
            </div>
            {dataSource && (
              <>
                <span>|</span>
                <span>
                  TradingView: {dataSource.tradingview} | Yahoo: {dataSource.yahoo}
                </span>
              </>
            )}
            <span>|</span>
            <span>200+ IDX stocks</span>
            <span>|</span>
            <span>Real-time quotes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SpikeContent({
  spikeTab,
  setSpikeTab,
  volumeRanking,
  loading,
}: {
  spikeTab: SpikeTab;
  setSpikeTab: (tab: SpikeTab) => void;
  volumeRanking: (ScreeningResult & { spike: number })[];
  loading: boolean;
}) {
  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {([
          { key: 'yesterday', label: 'Vs Yesterday' },
          { key: '3d', label: 'Vs 3D Avg' },
          { key: '5d', label: 'Vs 5D Avg' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSpikeTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              spikeTab === tab.key
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ranking List */}
      {loading ? (
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : volumeRanking.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-xs">No data</div>
      ) : (
        <div className="divide-y divide-gray-800/50 max-h-[calc(100vh-200px)] overflow-y-auto">
          {volumeRanking.map((item, idx) => {
            const spike = item.spike;
            const isVolumeUp = spike >= 0;
            const isPriceUp = item.price_change_percent >= 0;
            
            // Determine pressure: volume up + price up = buy, volume up + price down = sell
            let pressure: 'buy' | 'sell' | 'neutral' = 'neutral';
            let pressureLabel = '';
            if (isVolumeUp && spike > 20) {
              if (isPriceUp) {
                pressure = 'buy';
                pressureLabel = 'Buy';
              } else {
                pressure = 'sell';
                pressureLabel = 'Sell';
              }
            }

            return (
              <div key={item.ticker} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/30 transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  idx < 3 ? 'bg-orange-500/20' : 'bg-gray-800'
                }`}>
                  <span className={`text-xs font-bold ${
                    idx < 3 ? 'text-orange-400' : 'text-gray-400'
                  }`}>{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{item.ticker}</p>
                    {pressure !== 'neutral' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        pressure === 'buy'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {pressureLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.name}</p>
                  <p className="text-xs text-cyan-400 font-medium">{formatCurrency(item.price)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {isVolumeUp ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <p className={`text-sm font-bold ${isVolumeUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isVolumeUp ? '+' : ''}{spike}%
                    </p>
                  </div>
                  <p className={`text-[10px] ${isPriceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPriceUp ? '+' : ''}{item.price_change_percent.toFixed(2)}% price
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
