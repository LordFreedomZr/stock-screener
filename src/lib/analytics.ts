'use client';

function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`);
  }
}

export function reportWebVitals() {
  try {
    // Use PerformanceObserver for CLS, LCP, INP
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // CLS
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!e.hadRecentInput) {
              sendToAnalytics({ name: 'CLS', value: e.value, rating: e.value < 0.1 ? 'good' : e.value < 0.25 ? 'needs-improvement' : 'poor' });
            }
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });

      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (last) {
          const value = last.startTime;
          sendToAnalytics({ name: 'LCP', value, rating: value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor' });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // INP (Interaction to Next Paint)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'event') {
            const e = entry as PerformanceEntry & { processingStart: number };
            const value = e.processingStart - e.startTime;
            sendToAnalytics({ name: 'INP', value, rating: value < 200 ? 'good' : value < 500 ? 'needs-improvement' : 'poor' });
          }
        }
      }).observe({ type: 'event', buffered: true });
    }
  } catch {
    // PerformanceObserver not available
  }
}
