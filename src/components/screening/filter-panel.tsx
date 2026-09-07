'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterState } from '@/types';
import { SlidersHorizontal, X, Minus, Search } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    if (value === '') {
      onFiltersChange({ ...filters, [key]: null });
      return;
    }

    if (key === 'searchQuery') {
      onFiltersChange({ ...filters, [key]: value });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    onFiltersChange({ ...filters, [key]: numValue });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      priceMin: null,
      priceMax: null,
      volumeMin: null,
      maxLossPercent: null,
      maxLossNominal: null,
      maxProfitPercent: null,
      maxProfitNominal: null,
    });
  };

  const hasActiveFilters = filters.searchQuery || Object.values(filters).some((v) => v !== null && v !== '');

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
            Filter
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                Active
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
                Clear
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
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Search Stock
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Type ticker or name (e.g. BBCA)"
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="h-8 text-xs pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={filters.priceMin ?? ''}
                  onChange={(e) => updateFilter('priceMin', e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-gray-600">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={filters.priceMax ?? ''}
                  onChange={(e) => updateFilter('priceMax', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Min Volume
              </label>
              <Input
                type="number"
                placeholder="Min volume"
                min="0"
                value={filters.volumeMin ?? ''}
                onChange={(e) => updateFilter('volumeMin', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Max Loss (%)
              </label>
              <Input
                type="number"
                placeholder="Max loss %"
                min="0"
                max="100"
                value={filters.maxLossPercent ?? ''}
                onChange={(e) => updateFilter('maxLossPercent', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Max Loss (Rp)
              </label>
              <Input
                type="number"
                placeholder="Max loss nominal"
                min="0"
                value={filters.maxLossNominal ?? ''}
                onChange={(e) => updateFilter('maxLossNominal', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Max Profit (%)
              </label>
              <Input
                type="number"
                placeholder="Max profit %"
                min="0"
                value={filters.maxProfitPercent ?? ''}
                onChange={(e) => updateFilter('maxProfitPercent', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Max Profit (Rp)
              </label>
              <Input
                type="number"
                placeholder="Max profit nominal"
                min="0"
                value={filters.maxProfitNominal ?? ''}
                onChange={(e) => updateFilter('maxProfitNominal', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
