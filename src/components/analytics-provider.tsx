'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/analytics';

export function AnalyticsProvider() {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return null;
}
