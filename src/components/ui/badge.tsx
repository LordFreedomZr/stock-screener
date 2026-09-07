'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    secondary: 'border-transparent bg-gray-700 text-gray-300',
    destructive: 'border-transparent bg-red-500/10 text-red-400 border border-red-500/20',
    outline: 'text-gray-400 border-gray-700',
    success: 'border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'border-transparent bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
