'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, LineData, HistogramData, Time } from 'lightweight-charts';

interface MACDChartProps {
  data: { timestamp: string; macd: number; macd_signal: number; macd_histogram: number }[];
  height?: number;
}

export function MACDChart({ data, height = 150 }: MACDChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return;

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

    // MACD Histogram
    const histogramSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const histogramData: HistogramData[] = data
      .filter(d => d.macd_histogram != null)
      .map(d => ({
        time: (new Date(d.timestamp).getTime() / 1000) as Time,
        value: d.macd_histogram,
        color: d.macd_histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }));

    histogramSeries.setData(histogramData);

    // MACD Line
    const macdSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const macdData: LineData[] = data
      .filter(d => d.macd != null)
      .map(d => ({
        time: (new Date(d.timestamp).getTime() / 1000) as Time,
        value: d.macd,
      }));

    macdSeries.setData(macdData);

    // Signal Line
    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const signalData: LineData[] = data
      .filter(d => d.macd_signal != null)
      .map(d => ({
        time: (new Date(d.timestamp).getTime() / 1000) as Time,
        value: d.macd_signal,
      }));

    signalSeries.setData(signalData);

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
  }, [data, height]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full rounded-xl overflow-hidden bg-gray-900/50"
    />
  );
}

import { LineSeries, HistogramSeries } from 'lightweight-charts';
