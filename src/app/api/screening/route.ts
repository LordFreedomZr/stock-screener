import { NextResponse } from 'next/server';
import { fetchAllStocksScreening } from '@/lib/stocks/fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = await fetchAllStocksScreening();
    
    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
      count: results.length,
    });
  } catch (error) {
    console.error('Error in screening API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch screening data' },
      { status: 500 }
    );
  }
}
