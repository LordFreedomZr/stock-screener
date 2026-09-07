'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchlistCard } from '@/components/watchlist/watchlist-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistItem } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Star, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'stopped'>('all');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWatchlist = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setFetching(true);
    try {
      const response = await fetch('/api/watchlist', {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (data.success && data.data) {
        setItems(data.data);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchWatchlist]);

  const handleStop = async (ticker: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, action: 'stop' }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setItems(prev =>
          prev.map(item =>
            item.ticker === ticker
              ? { ...item, status: 'stopped' as const }
              : item
          )
        );
      } else {
        console.error('Failed to stop:', data.error);
      }
    } catch (error) {
      console.error('Error stopping watchlist item:', error);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const activeCount = items.filter(i => i.status === 'active').length;
  const stoppedCount = items.filter(i => i.status === 'stopped').length;

  const stats = {
    benar: items.filter(i => i.latest_evaluation?.status === 'benar').length,
    floating: items.filter(i => i.latest_evaluation?.status === 'floating').length,
    meleset: items.filter(i => i.latest_evaluation?.status === 'meleset').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-500 text-sm mt-1">
            {items.length} stocks being monitored
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchWatchlist}
          disabled={fetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{stats.benar}</p>
                <p className="text-xs text-gray-500">Benar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.floating}</p>
                <p className="text-xs text-gray-500">Floating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.meleset}</p>
                <p className="text-xs text-gray-500">Meleset</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'stopped'] as const).map(tab => (
          <Button
            key={tab}
            variant={filter === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(tab)}
            className={filter === tab ? '' : 'text-gray-400 hover:text-white'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'active' && ` (${activeCount})`}
            {tab === 'stopped' && ` (${stoppedCount})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-gray-800/50 bg-gray-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-32" />
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
      ) : filteredItems.length === 0 ? (
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-12 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-2">No Watchlist Items</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'Add stocks from the Dashboard to start monitoring them.'
                : `No ${filter} items in your watchlist.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <WatchlistCard key={item.id} item={item} onStop={handleStop} />
          ))}
        </div>
      )}
    </div>
  );
}
