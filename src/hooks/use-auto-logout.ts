'use client';

import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const EXPIRY_CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes

export function useAutoLogout() {
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const expiryTimer = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOut = useRef(false);

  const logout = useCallback(async (reason: string) => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}

    if (reason === 'expired') {
      window.location.href = '/login?error=expired';
    } else {
      window.location.href = '/login?error=inactive';
    }
  }, []);

  const checkExpiry = useCallback(async () => {
    if (isLoggingOut.current) return;
    try {
      const res = await fetch('/api/auth/check-expiry');
      const data = await res.json();
      if (data.expired) {
        logout('expired');
      }
    } catch {
      // Skip on network error
    }
  }, [logout]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      logout('inactive');
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    resetInactivityTimer();

    expiryTimer.current = setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL);

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(event => document.addEventListener(event, handler, { passive: true }));

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (expiryTimer.current) clearInterval(expiryTimer.current);
      events.forEach(event => document.removeEventListener(event, handler));
    };
  }, [resetInactivityTimer, checkExpiry]);
}
