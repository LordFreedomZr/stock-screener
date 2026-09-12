'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchlistCard } from '@/components/watchlist/watchlist-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistItem } from '@/types';
import { Star, RefreshCw, CheckCircle, XCircle, Clock, Zap, Target } from 'lucide-react';

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalNotice, setEvalNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'stopped'>('active');
  const [groups, setGroups] = useState<string[]>(['Default']);
  const [selectedGroup, setSelectedGroup] = useState<string>('Default');
  const [newGroupName, setNewGroupName] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const groupsLoadedRef = useRef(false);

  // Load groups from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('watchlist_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGroups(parsed);
        }
      } catch {}
    }
    const savedGroup = localStorage.getItem('watchlist_selected_group');
    if (savedGroup) setSelectedGroup(savedGroup);
    groupsLoadedRef.current = true;
  }, []);

  // Save groups to localStorage when changed
  useEffect(() => {
    if (groupsLoadedRef.current && groups.length > 0) {
      localStorage.setItem('watchlist_groups', JSON.stringify(groups));
    }
  }, [groups]);

  useEffect(() => {
    if (groupsLoadedRef.current) {
      localStorage.setItem('watchlist_selected_group', selectedGroup);
    }
  }, [selectedGroup]);

  const addGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed].sort();
      localStorage.setItem('watchlist_groups', JSON.stringify(updated));
      return updated;
    });
    setSelectedGroup(trimmed);
  };

  const fetchWatchlist = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setFetching(true);
    try {
      // Fetch items (without group filter - group filtering done client-side)
      const response = await fetch(`/api/watchlist`, {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (data.success && data.data) {
        setItems(data.data);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    fetchWatchlist();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchWatchlist]);

  // On-demand evaluation for all active items
  const handleEvaluateAll = async () => {
    setEvaluating(true);
    setEvalNotice(null);
    try {
      const response = await fetch('/api/watchlist/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await response.json();

      if (res.success && res.data) {
        setItems(res.data);
        const s = res.summary;
        if (s) {
          setEvalNotice(
            `Evaluasi selesai: ${s.benar} Benar, ${s.floating} Floating, ${s.meleset} Meleset (Hit Rate: ${s.hitRate.toFixed(1)}%)`
          );
          setTimeout(() => setEvalNotice(null), 5000);
        }
      } else {
        setEvalNotice(res.error || 'Gagal mengevaluasi watchlist.');
      }
    } catch (err) {
      console.error('Error evaluating watchlist:', err);
      setEvalNotice('Gagal menghubungkan ke server evaluasi.');
    } finally {
      setEvaluating(false);
    }
  };

  // Evaluate single item
  const handleEvaluateSingle = async (ticker: string) => {
    try {
      const response = await fetch('/api/watchlist/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const res = await response.json();
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error(`Error evaluating ${ticker}:`, err);
    }
  };

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
        setItems((prev) =>
          prev.map((item) =>
            item.ticker === ticker
              ? { ...item, status: 'stopped' as const, stopped_at: new Date().toISOString() }
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

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const activeCount = items.filter((i) => i.status === 'active').length;
  const stoppedCount = items.filter((i) => i.status === 'stopped').length;

  const stats = {
    benar: items.filter((i) => i.latest_evaluation?.status === 'benar').length,
    floating: items.filter((i) => i.latest_evaluation?.status === 'floating').length,
    meleset: items.filter((i) => i.latest_evaluation?.status === 'meleset').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-500 text-sm mt-1">
            {items.length} saham dalam pemantauan ({activeCount} aktif)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleEvaluateAll}
            disabled={evaluating || activeCount === 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-semibold shadow-lg shadow-cyan-500/20"
          >
            <Zap className={`w-4 h-4 mr-2 ${evaluating ? 'animate-spin text-gray-950' : 'fill-gray-950'}`} />
            {evaluating ? 'Mengevaluasi Live...' : 'Evaluasi Sekarang'}
          </Button>
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
      </div>

      {/* Notification Banner */}
      {evalNotice && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in duration-300">
          <Target className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{evalNotice}</span>
        </div>
      )}

      {/* Evaluation Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{stats.benar}</p>
                <p className="text-xs text-gray-500">Prediksi Benar</p>
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
                <p className="text-xs text-gray-500">Floating (-2% s/d +2%)</p>
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

      {/* Group Tabs */}
      <div className="flex gap-2 items-center flex-wrap">
        {groups.map((g) => (
          <Button
            key={g}
            variant={selectedGroup === g ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedGroup(g)}
            className={selectedGroup === g ? 'bg-cyan-500 text-gray-950' : 'text-gray-400 hover:text-white'}
          >
            {g}
          </Button>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            placeholder="Group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="h-8 text-xs w-32 px-2 rounded border border-gray-700 bg-gray-800 text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newGroupName.trim()) {
                addGroup(newGroupName);
                setNewGroupName('');
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300"
            onClick={() => {
              if (newGroupName.trim()) {
                addGroup(newGroupName);
                setNewGroupName('');
              }
            }}
          >
            +
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'stopped'] as const).map((tab) => (
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

      {/* List / Grid Content */}
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
            <h3 className="text-lg font-medium text-white mb-2">Watchlist Kosong</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {filter === 'all'
                ? 'Tambahkan saham dari halaman Dashboard atau Detail Saham untuk mulai memantau dan mengevaluasi pergerakan sinyalnya.'
                : `Tidak ada saham berstatus ${filter} di dalam watchlist.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onStop={handleStop}
              onEvaluate={handleEvaluateSingle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
