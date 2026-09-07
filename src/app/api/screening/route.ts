import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('screening_results')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const latestResults = new Map();
    data?.forEach((result: any) => {
      if (!latestResults.has(result.ticker)) {
        latestResults.set(result.ticker, result);
      }
    });

    return NextResponse.json(Array.from(latestResults.values()));
  } catch (error) {
    console.error('Error fetching screening results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screening results' },
      { status: 500 }
    );
  }
}
