import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Input validation
function validateTicker(ticker: unknown): ticker is string {
  return typeof ticker === 'string' && ticker.length > 0 && ticker.length <= 10 && /^[A-Z0-9]+$/.test(ticker);
}

function validateAction(action: unknown): action is 'add' | 'stop' {
  return action === 'add' || action === 'stop';
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .order('marked_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      );
    }

    const itemsWithEvaluation = await Promise.all(
      (data || []).map(async (item: any) => {
        try {
          const { data: evalData } = await supabase
            .from('watchlist_evaluations')
            .select('*')
            .eq('watchlist_item_id', item.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle instead of single

          return {
            ...item,
            latest_evaluation: evalData || null,
          };
        } catch (err) {
          return {
            ...item,
            latest_evaluation: null,
          };
        }
      })
    );

    return NextResponse.json({ success: true, data: itemsWithEvaluation });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, action } = body;

    // Validate inputs
    if (!validateTicker(ticker)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker format' },
        { status: 400 }
      );
    }

    if (!validateAction(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "add" or "stop"' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Check if already active in watchlist
      const { data: existingActive } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('ticker', ticker)
        .eq('status', 'active')
        .limit(1);

      if (existingActive && existingActive.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Stock already in watchlist' },
          { status: 409 }
        );
      }

      // Check if there's a stopped item - reactivate it
      const { data: existingStopped } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('ticker', ticker)
        .eq('status', 'stopped')
        .limit(1);

      if (existingStopped && existingStopped.length > 0) {
        // Reactivate the stopped item
        const { data, error } = await supabase
          .from('watchlist_items')
          .update({ status: 'active', stopped_at: null })
          .eq('id', existingStopped[0].id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to reactivate watchlist item' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      // Create new watchlist item
      const { data, error } = await supabase
        .from('watchlist_items')
        .insert({ ticker, status: 'active' })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to add to watchlist' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    } else {
      const { data, error } = await supabase
        .from('watchlist_items')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('ticker', ticker)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to stop watchlist item' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { success: false, error: 'Watchlist item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update watchlist' },
      { status: 500 }
    );
  }
}
