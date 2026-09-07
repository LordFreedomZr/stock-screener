'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterState } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onFiltersChange({ ...filters, [key]: numValue });
  };

  const clearFilters = () => {
    onFiltersChange({
      priceMin: null,
      priceMax: null,
      volumeMin: null,
      maxLossPercent: null,
      maxLossNominal: null,
      maxProfitPercent: null,
      maxProfitNominal: null,
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            Filter
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white"
            >
              {isOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin ?? ''}
                  onChange={(e) => updateFilter('priceMin', e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-gray-600">-</span>
                <Input
                  type="number"
                  placeholder="Max"
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
