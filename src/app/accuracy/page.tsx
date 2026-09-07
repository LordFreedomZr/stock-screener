'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccuracyStats } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatPercent } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown, Activity, RefreshCw, Target } from 'lucide-react';

export default function AccuracyPage() {
  const [stats, setStats] = useState<AccuracyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('accuracy_stats')
        .select('*')
        .order('hit_rate', { ascending: false });

      if (error) throw error;
      setStats(data as AccuracyStats[]);
    } catch (error) {
      console.error('Error fetching accuracy stats:', error);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  const totalEvaluations = stats.reduce((sum, s) => sum + s.total_evaluations, 0);
  const totalCorrect = stats.reduce((sum, s) => sum + s.correct_count, 0);
  const overallHitRate = totalEvaluations > 0 ? (totalCorrect / totalEvaluations) * 100 : 0;

  const topIndicators = stats.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accuracy Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track prediction accuracy and improve your analysis
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={fetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalEvaluations}</p>
                <p className="text-xs text-gray-500">Total Evaluations</p>
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
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPercent(overallHitRate)}
                </p>
                <p className="text-xs text-gray-500">Overall Hit Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats.reduce((sum, s) => sum + s.floating_count, 0)}
                </p>
                <p className="text-xs text-gray-500">Floating</p>
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
                <p className="text-2xl font-bold text-red-400">
                  {stats.reduce((sum, s) => sum + s.missed_count, 0)}
                </p>
                <p className="text-xs text-gray-500">Missed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            Top Performing Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-8 h-8" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : topIndicators.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500">No accuracy data available yet.</p>
              <p className="text-sm text-gray-600 mt-1">
                Add stocks to your watchlist and wait for evaluations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topIndicators.map((stat, index) => (
                <div
                  key={stat.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-400">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {stat.indicator}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {stat.combination}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${stat.hit_rate >= 60 ? 'text-emerald-400' : stat.hit_rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatPercent(stat.hit_rate)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stat.correct_count}/{stat.total_evaluations}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            All Accuracy Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500">No statistics available yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Indicator</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Score Range</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Correct</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Hit Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr
                      key={stat.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="py-3 px-4 text-white">{stat.indicator}</td>
                      <td className="py-3 px-4 text-gray-400">{stat.score_range}</td>
                      <td className="py-3 px-4 text-right text-gray-400">
                        {stat.total_evaluations}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {stat.correct_count}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={
                            stat.hit_rate >= 60
                              ? 'success'
                              : stat.hit_rate >= 40
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {formatPercent(stat.hit_rate)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
