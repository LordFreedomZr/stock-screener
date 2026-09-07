'use client';

import { useState, useEffect } from 'react';
import { ScreeningCard } from '@/components/screening/screening-card';
import { FilterPanel } from '@/components/screening/filter-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterState, ScreeningResult } from '@/types';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatDate } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    priceMin: null,
    priceMax: null,
    volumeMin: null,
    maxLossPercent: null,
    maxLossNominal: null,
    maxProfitPercent: null,
    maxProfitNominal: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchScreeningResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('screening_results')
        .select('*')
        .order('timestamp', { ascending: false })
        .order('score', { ascending: false });

      if (error) throw error;

      const latestResults = new Map<string, ScreeningResult>();
      data?.forEach((result: any) => {
        if (!latestResults.has(result.ticker)) {
          latestResults.set(result.ticker, result as ScreeningResult);
        }
      });

      setResults(Array.from(latestResults.values()));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching screening results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreeningResults();
    const interval = setInterval(fetchScreeningResults, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredResults = results.filter((result) => {
    if (filters.priceMin !== null && result.price < filters.priceMin) return false;
    if (filters.priceMax !== null && result.price > filters.priceMax) return false;
    if (filters.volumeMin !== null && result.volume < filters.volumeMin) return false;
    if (filters.maxLossPercent !== null && result.max_loss_percent > filters.maxLossPercent) return false;
    if (filters.maxLossNominal !== null && result.max_loss_nominal > filters.maxLossNominal) return false;
    if (filters.maxProfitPercent !== null && result.max_profit_percent < filters.maxProfitPercent) return false;
    if (filters.maxProfitNominal !== null && result.max_profit_nominal < filters.maxProfitNominal) return false;
    return true;
  });

  const bullishCount = filteredResults.filter((r) => r.direction === 'bullish').length;
  const bearishCount = filteredResults.filter((r) => r.direction === 'bearish').length;

  return (
    <div className="space-y-6">
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
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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

      <FilterPanel filters={filters} onFiltersChange={setFilters} />

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
                ? 'No screening results available yet. Run a screening first.'
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
    </div>
  );
}
