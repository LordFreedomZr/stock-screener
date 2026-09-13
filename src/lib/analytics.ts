'use client';

import { onCLS, onINP, onLCP, Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`);
  }
  
  // In production, you could send to analytics service
  // Example: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(metric) });
}

export function reportWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
  } catch {
    // web-vitals not available
  }
}
