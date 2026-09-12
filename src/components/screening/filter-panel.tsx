'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterState } from '@/types';
import { SlidersHorizontal, X, Minus, Search, ArrowUpDown, ChevronDown } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sectors?: string[];
}

export function FilterPanel({ filters, onFiltersChange, sectors = [] }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorUp, setSectorUp] = useState(false);
  const sectorRef = useRef<HTMLDivElement>(null);

  const availableSectors = ['All Sectors', ...new Set(sectors)].filter(Boolean);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (sectorOpen && sectorRef.current) {
      const rect = sectorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setSectorUp(spaceBelow < 300);
    }
  }, [sectorOpen]);

  const updateFilter = (key: keyof FilterState, value: string, autoClose = false) => {
    if (value === '') {
      onFiltersChange({ ...filters, [key]: key === 'sortBy' ? 'score' : '' });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
    if (autoClose) setIsOpen(false);
  };

  const updateNumFilter = (key: keyof FilterState, value: string) => {
    if (value === '') {
      onFiltersChange({ ...filters, [key]: null });
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    onFiltersChange({ ...filters, [key]: numValue });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      sector: '',
      sortBy: 'score',
      priceMin: null,
      priceMax: null,
      volumeMin: null,
      maxLossPercent: null,
      maxLossNominal: null,
      maxProfitPercent: null,
      maxProfitNominal: null,
    });
  };

  const hasActiveFilters = filters.searchQuery || filters.sector || (filters.sortBy && filters.sortBy !== 'score') || Object.values(filters).some((v) => v !== null && v !== '' && v !== 'score');

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => {
          if (!isOpen) setIsOpen(true);
        }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            Filter & Sort
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                Aktif
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Hapus
              </Button>
            )}
            {isOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Ticker atau nama"
                  value={filters.searchQuery || ''}
                  onChange={(e) => updateFilter('searchQuery', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsOpen(false);
                  }}
                  className="h-8 text-xs pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Sektor
              </label>
              <div className="relative" ref={sectorRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectorOpen(!sectorOpen);
                  }}
                  className="h-8 text-xs w-full rounded-md border border-gray-700 bg-gray-800 px-2 text-white flex items-center justify-between"
                >
                  <span className="truncate">{filters.sector || 'Semua Sektor'}</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 ml-1 transition-transform ${sectorUp ? 'rotate-180' : ''}`} />
                </button>
                {sectorOpen && (
                  <div className={`absolute z-[100] left-0 right-0 max-h-60 overflow-y-auto rounded-md border border-gray-700 bg-gray-800 shadow-lg ${
                    sectorUp ? 'bottom-full mb-1' : 'top-full mt-1'
                  }`}>
                    {availableSectors.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFilter('sector', s === 'All Sectors' ? '' : s, true);
                          setSectorOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${
                          (filters.sector || 'All Sectors') === s ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Urutkan
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { value: 'score', label: 'Skor' },
                { value: 'rsi', label: 'RSI' },
                { value: 'volume', label: 'Volume' },
                { value: 'price_change', label: 'Ubah%' },
                { value: 'rvol', label: 'RVOL' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilter('sortBy', value, true);
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    filters.sortBy === value
                      ? 'bg-cyan-500 text-gray-950 font-medium'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Rentang Harga
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={filters.priceMin ?? ''}
                  onChange={(e) => updateNumFilter('priceMin', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                  className="h-8 text-xs"
                />
                <span className="text-gray-600">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={filters.priceMax ?? ''}
                  onChange={(e) => updateNumFilter('priceMax', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Volume Minimum
              </label>
              <Input
                type="number"
                placeholder="Volume minimum"
                min="0"
                value={filters.volumeMin ?? ''}
                onChange={(e) => updateNumFilter('volumeMin', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
