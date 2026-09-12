'use client';

import { useAutoLogout } from '@/hooks/use-auto-logout';

export function AutoLogoutProvider() {
  useAutoLogout();
  return null;
}
