import { NextRequest, NextResponse } from 'next/server';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_NEWS = 'https://query2.finance.yahoo.com/v1/finance/search';

function getHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
}

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  thumbnail?: string;
  type: string;
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Ticker required' }, { status: 400 });
  }

  try {
    const yahooTicker = `${ticker}.JK`;

    // Try Yahoo Finance quote summary for news
    const url = `https://query2.finance.yahoo.com/v1/finance/lookup?symbols=${yahooTicker}&types=news&count=10`;

    const res = await fetch(url, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      // Fallback: try search endpoint
      const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&newsCount=10`;
      const searchRes = await fetch(searchUrl, { headers: getHeaders() });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const news = (searchData.news || []).map((n: Record<string, unknown>) => ({
          title: n.title || '',
          link: n.link || '',
          publisher: n.publisher || '',
          publishedAt: n.providerPublishTime
            ? new Date((n.providerPublishTime as number) * 1000).toISOString()
            : '',
          thumbnail: '',
          type: n.type || 'article',
        }));
        return NextResponse.json({ success: true, data: news });
      }

      // Final fallback: return empty
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await res.json();
    const news: NewsItem[] = [];

    // Parse news from quote summary
    if (data?.finance?.result?.[0]?.news) {
      for (const item of data.finance.result[0].news) {
        news.push({
          title: item.title || '',
          link: item.link || '',
          publisher: item.publisher || '',
          publishedAt: item.providerPublishTime
            ? new Date(item.providerPublishTime * 1000).toISOString()
            : '',
          thumbnail: item.thumbnail?.resolutions?.[0]?.url || '',
          type: item.type || 'article',
        });
      }
    }

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
