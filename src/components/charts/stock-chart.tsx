'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { PriceSnapshot } from '@/types';

interface StockChartProps {
  data: PriceSnapshot[];
  height?: number;
  indicators?: {
    showRSI?: boolean;
    showMACD?: boolean;
    showVolume?: boolean;
  };
}

export function StockChart({ 
  data, 
  height = 400,
  indicators = { showVolume: true, showRSI: false, showMACD: false }
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        vertLine: { color: '#06b6d4', width: 1, style: 2, labelBackgroundColor: '#06b6d4' },
        horzLine: { color: '#06b6d4', width: 1, style: 2, labelBackgroundColor: '#06b6d4' },
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    const candlestickData: CandlestickData[] = data.map((item) => ({
      time: (new Date(item.timestamp).getTime() / 1000) as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(candlestickData);

    if (indicators.showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#06b6d4',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData: HistogramData[] = data.map((item) => ({
        time: (new Date(item.timestamp).getTime() / 1000) as Time,
        value: item.volume,
        color: item.close >= item.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }));

      volumeSeries.setData(volumeData);
    }

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, indicators]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full rounded-xl overflow-hidden bg-gray-900/50"
    />
  );
}

// Import series types
import { CandlestickSeries, HistogramSeries } from 'lightweight-charts';
