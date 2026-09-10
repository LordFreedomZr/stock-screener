'use client';

import { useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PAGES = ['/', '/watchlist', '/accuracy', '/settings'];

export function SwipeNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);

  const currentIndex = PAGES.indexOf(pathname);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only register horizontal swipes (dx > dy and minimum distance)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      isSwiping.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;

    // We need the final delta to determine direction
    // But touchEnd doesn't have touches, so we use the last known position
    // Instead, let's use a simpler approach with touchStart tracking
    isSwiping.current = false;
  }, []);

  // Use a more reliable approach with pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isSwiping.current = false;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const deltaX = e.clientX - touchStartX.current;
    const deltaY = e.clientY - touchStartY.current;

    // Only trigger on horizontal swipes with sufficient distance
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
      if (deltaX < 0 && currentIndex < PAGES.length - 1) {
        // Swipe left → next page
        router.push(PAGES[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right → previous page
        router.push(PAGES[currentIndex - 1]);
      }
    }
  }, [currentIndex, router]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="min-h-screen touch-pan-y"
    >
      {children}
    </div>
  );
}
