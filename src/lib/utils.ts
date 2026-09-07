import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-400';
  if (score >= 3) return 'text-yellow-400';
  if (score >= 2) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBg(score: number): string {
  if (score >= 4) return 'bg-emerald-400/10';
  if (score >= 3) return 'bg-yellow-400/10';
  if (score >= 2) return 'bg-orange-400/10';
  return 'bg-red-400/10';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'benar':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'floating':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'meleset':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
}

export function getDirectionColor(direction: string): string {
  return direction === 'bullish' ? 'text-emerald-400' : 'text-red-400';
}
