'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Star, BarChart3, Settings, LogOut, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Watchlist', href: '/watchlist', icon: Star },
  { name: 'Compare', href: '/compare', icon: GitCompareArrows },
  { name: 'Accuracy', href: '/accuracy', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-around h-16">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-cyan-400'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive && 'text-cyan-400')} />
                <span>{item.name}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{loggingOut ? '...' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
