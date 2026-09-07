import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .order('marked_at', { ascending: false });

    if (error) throw error;

    const itemsWithEvaluation = await Promise.all(
      (data || []).map(async (item: any) => {
        const { data: evalData } = await supabase
          .from('watchlist_evaluations')
          .select('*')
          .eq('watchlist_item_id', item.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        return {
          ...item,
          latest_evaluation: evalData || null,
        };
      })
    );

    return NextResponse.json(itemsWithEvaluation);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, action } = body;

    if (action === 'add') {
      const { data, error } = await supabase
        .from('watchlist_items')
        .insert({ ticker, status: 'active' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else if (action === 'stop') {
      const { data, error } = await supabase
        .from('watchlist_items')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('ticker', ticker)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to update watchlist' },
      { status: 500 }
    );
  }
}
