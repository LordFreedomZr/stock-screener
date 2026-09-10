'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, LineData, Time } from 'lightweight-charts';

interface RSIChartProps {
  data: { timestamp: string; rsi: number }[];
  height?: number;
  oversold?: number;
  overbought?: number;
}

export function RSIChart({ 
  data, 
  height = 150,
  oversold = 30,
  overbought = 70,
}: RSIChartProps) {
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // RSI line
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const rsiData: LineData[] = data
      .filter(d => d.rsi != null)
      .map(d => ({
        time: (new Date(d.timestamp).getTime() / 1000) as Time,
        value: d.rsi,
      }));

    rsiSeries.setData(rsiData);

    // Oversold line
    const oversoldSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const oversoldData: LineData[] = data.map(d => ({
      time: (new Date(d.timestamp).getTime() / 1000) as Time,
      value: oversold,
    }));
    oversoldSeries.setData(oversoldData);

    // Overbought line
    const overboughtSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const overboughtData: LineData[] = data.map(d => ({
      time: (new Date(d.timestamp).getTime() / 1000) as Time,
      value: overbought,
    }));
    overboughtSeries.setData(overboughtData);

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
  }, [data, height, oversold, overbought]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full rounded-xl overflow-hidden bg-gray-900/50"
    />
  );
}

import { LineSeries } from 'lightweight-charts';
