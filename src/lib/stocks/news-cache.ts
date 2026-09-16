import { analyzeSentiment, analyzeNewsSentiment, SentimentResult } from './sentiment';

interface CachedSentiment {
  result: SentimentResult;
  timestamp: number;
}

const sentimentCache = new Map<string, CachedSentiment>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL
const pendingFetches = new Set<string>();

function getHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
}

/**
 * Get cached sentiment for a ticker if available and not expired.
 */
export function getNewsSentimentFromCache(ticker: string): SentimentResult | null {
  const key = ticker.trim().toUpperCase();
  const entry = sentimentCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.result;
  }
  if (entry) {
    sentimentCache.delete(key);
  }
  return null;
}

/**
 * Save sentiment result to cache.
 */
export function setNewsSentimentCache(ticker: string, result: SentimentResult): void {
  const key = ticker.trim().toUpperCase();
  // Limit cache size to 200 entries
  if (sentimentCache.size > 200) {
    const oldestKey = sentimentCache.keys().next().value;
    if (oldestKey) sentimentCache.delete(oldestKey);
  }
  sentimentCache.set(key, { result, timestamp: Date.now() });
}

/**
 * Fetch Google News RSS for a ticker and calculate aggregate sentiment.
 */
export async function fetchAndCacheNewsSentiment(ticker: string): Promise<SentimentResult> {
  const key = ticker.trim().toUpperCase();
  
  // Check cache first
  const cached = getNewsSentimentFromCache(key);
  if (cached) return cached;

  try {
    const query = encodeURIComponent(`saham ${key}`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(url, { headers: getHeaders() });

    if (!res.ok) {
      const emptyResult = analyzeNewsSentiment([]);
      setNewsSentimentCache(key, emptyResult);
      return emptyResult;
    }

    const xml = await res.text();
    const headlines: string[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && headlines.length < 8) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
        if (rawTitle.includes(' - ')) {
          const parts = rawTitle.split(' - ');
          parts.pop();
          rawTitle = parts.join(' - ');
        }
        if (rawTitle) headlines.push(rawTitle);
      }
    }

    const result = analyzeNewsSentiment(headlines);
    setNewsSentimentCache(key, result);
    return result;
  } catch (error) {
    const fallbackResult = analyzeNewsSentiment([]);
    setNewsSentimentCache(key, fallbackResult);
    return fallbackResult;
  }
}

/**
 * Background pre-fetcher for top tickers to warm up news sentiment cache.
 * Runs asynchronously without blocking the response.
 */
export function warmupNewsSentimentCache(tickers: string[]): void {
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase())));

  // Filter tickers needing cache warmup
  const tickersToWarmup = uniqueTickers.filter((ticker) => {
    if (getNewsSentimentFromCache(ticker) !== null) return false;
    if (pendingFetches.has(ticker)) return false;
    return true;
  });

  if (tickersToWarmup.length === 0) return;

  // Process in background batches of 3 concurrently
  (async () => {
    const batchSize = 3;
    for (let i = 0; i < tickersToWarmup.length; i += batchSize) {
      const chunk = tickersToWarmup.slice(i, i + batchSize);
      chunk.forEach((t) => pendingFetches.add(t));

      await Promise.all(
        chunk.map(async (t) => {
          try {
            await fetchAndCacheNewsSentiment(t);
          } finally {
            pendingFetches.delete(t);
          }
        })
      );

      // Delay 300ms between batches to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  })().catch(() => {});
}
