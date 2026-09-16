import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, analyzeNewsSentiment, SentimentResult } from '@/lib/stocks/sentiment';

function getHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
}

export interface AnalyzedNewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  thumbnail?: string;
  type: string;
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
    positiveWords: string[];
    negativeWords: string[];
  };
}

async function fetchGoogleNewsRSS(ticker: string): Promise<AnalyzedNewsItem[]> {
  try {
    const query = encodeURIComponent(`saham ${ticker}`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: AnalyzedNewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

      let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
      let publisher = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';

      if (rawTitle.includes(' - ') && !publisher) {
        const parts = rawTitle.split(' - ');
        publisher = parts.pop() || '';
        rawTitle = parts.join(' - ');
      }

      const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
      let publishedAt = new Date().toISOString();
      if (pubDateMatch) {
        try {
          publishedAt = new Date(pubDateMatch[1]).toISOString();
        } catch {}
      }

      if (rawTitle) {
        const sent = analyzeSentiment(rawTitle);
        items.push({
          title: rawTitle,
          link,
          publisher: publisher || 'Google News',
          publishedAt,
          type: 'article',
          sentiment: {
            score: sent.score,
            label: sent.label,
            confidence: sent.confidence,
            positiveWords: sent.details.positiveWords,
            negativeWords: sent.details.negativeWords,
          },
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchYahooNews(ticker: string): Promise<AnalyzedNewsItem[]> {
  try {
    const yahooTicker = `${ticker}.JK`;
    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&newsCount=10`;
    const res = await fetch(searchUrl, { headers: getHeaders() });

    if (!res.ok) return [];

    const searchData = await res.json();
    const news = searchData.news || [];
    const items: AnalyzedNewsItem[] = [];

    for (const n of news) {
      const title = String(n.title || '');
      if (!title) continue;
      const sent = analyzeSentiment(title);
      items.push({
        title,
        link: String(n.link || ''),
        publisher: String(n.publisher || 'Yahoo Finance'),
        publishedAt: n.providerPublishTime
          ? new Date((n.providerPublishTime as number) * 1000).toISOString()
          : new Date().toISOString(),
        thumbnail: '',
        type: String(n.type || 'article'),
        sentiment: {
          score: sent.score,
          label: sent.label,
          confidence: sent.confidence,
          positiveWords: sent.details.positiveWords,
          negativeWords: sent.details.negativeWords,
        },
      });
    }

    return items;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Ticker required' }, { status: 400 });
  }

  try {
    // 1. Fetch from Google News RSS (best for Indonesian stock news)
    let newsItems = await fetchGoogleNewsRSS(ticker);

    // 2. If Google News has few results, append Yahoo Finance news
    if (newsItems.length < 5) {
      const yahooItems = await fetchYahooNews(ticker);
      const existingTitles = new Set(newsItems.map((i) => i.title.toLowerCase()));
      for (const item of yahooItems) {
        if (!existingTitles.has(item.title.toLowerCase())) {
          newsItems.push(item);
        }
      }
    }

    // Sort by publication date descending
    newsItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Compute aggregate sentiment across all headlines
    const headlines = newsItems.map((item) => item.title);
    const aggregateSentiment: SentimentResult = analyzeNewsSentiment(headlines);

    return NextResponse.json({
      success: true,
      data: newsItems,
      sentiment: aggregateSentiment,
      count: newsItems.length,
    });
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json({ success: true, data: [], sentiment: analyzeNewsSentiment([]) });
  }
}

