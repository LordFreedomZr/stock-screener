'use client';

import { useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PAGES = ['/', '/watchlist', '/compare', '/accuracy', '/settings'];

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.closest('[data-swipe-ignore]')) return true;
  if (target.closest('select, input, button, textarea, a, [role="button"], [role="listbox"]')) return true;
  const tag = target.tagName;
  return tag === 'SELECT' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA';
}

export function SwipeNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const startX = useRef(0);
  const startY = useRef(0);
  const active = useRef(false);

  const currentIndex = PAGES.indexOf(pathname);

  const onDown = useCallback((e: React.PointerEvent) => {
    if (isInteractiveTarget(e.target)) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    active.current = true;
  }, []);

  const onUp = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    active.current = false;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 80) {
      if (dx < 0 && currentIndex < PAGES.length - 1) {
        router.push(PAGES[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        router.push(PAGES[currentIndex - 1]);
      }
    }
  }, [currentIndex, router]);

  return (
    <div
      onPointerDown={onDown}
      onPointerUp={onUp}
      className="min-h-screen touch-pan-y"
    >
      {children}
    </div>
  );
}
