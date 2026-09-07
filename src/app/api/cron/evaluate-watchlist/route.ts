import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toYahooTicker } from '@/lib/stocks/idx-tickers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Vercel Cron: runs every hour
// Add to vercel.json: { "crons": [{ "path": "/api/cron/evaluate-watchlist", "schedule": "0 * * * *" }] }

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

async function fetchCurrentPrice(ticker: string): Promise<PriceData | null> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) return null;
    
    const meta = result.meta;
    return {
      price: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      changePercent: meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0,
    };
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return null;
  }
}

function determineEvaluationStatus(
  direction: 'bullish' | 'bearish',
  priceChangePercent: number
): 'benar' | 'floating' | 'meleset' {
  // Floating if price change is small (between -2% and +2%)
  if (priceChangePercent > -2 && priceChangePercent < 2) {
    return 'floating';
  }
  
  // Benar if price moved in predicted direction
  if (direction === 'bullish' && priceChangePercent > 0) {
    return 'benar';
  }
  if (direction === 'bearish' && priceChangePercent < 0) {
    return 'benar';
  }
  
  // Meleset if price moved opposite to predicted direction
  return 'meleset';
}

export async function GET(request: Request) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting watchlist evaluation...');

    // Get all active watchlist items
    const { data: activeItems, error: fetchError } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching watchlist:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      );
    }

    if (!activeItems || activeItems.length === 0) {
      console.log('No active watchlist items to evaluate');
      return NextResponse.json({
        success: true,
        message: 'No active items to evaluate',
        evaluated: 0,
      });
    }

    console.log(`Evaluating ${activeItems.length} active items...`);

    let evaluatedCount = 0;
    let errorCount = 0;

    // Process each active item
    for (const item of activeItems) {
      try {
        // Fetch current price
        const priceData = await fetchCurrentPrice(item.ticker);
        
        if (!priceData || priceData.price === 0) {
          console.warn(`Failed to fetch price for ${item.ticker}`);
          errorCount++;
          continue;
        }

        // Get the analysis direction from screening data
        // We'll use a simple heuristic: if we don't have direction, use price change
        // In a real system, you'd fetch this from your screening data
        const direction: 'bullish' | 'bearish' = priceData.changePercent >= 0 ? 'bullish' : 'bearish';

        // Determine evaluation status
        const evaluationStatus = determineEvaluationStatus(direction, priceData.changePercent);

        // Check if we already have an evaluation for this item today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existingEval } = await supabase
          .from('watchlist_evaluations')
          .select('id')
          .eq('watchlist_item_id', item.id)
          .gte('timestamp', today.toISOString())
          .limit(1);

        if (existingEval && existingEval.length > 0) {
          // Update existing evaluation
          const { error: updateError } = await supabase
            .from('watchlist_evaluations')
            .update({
              status: evaluationStatus,
              price_movement_percent: priceData.changePercent,
              price_movement_nominal: priceData.change,
              current_price: priceData.price,
              timestamp: new Date().toISOString(),
            })
            .eq('id', existingEval[0].id);

          if (updateError) {
            console.error(`Error updating evaluation for ${item.ticker}:`, updateError);
            errorCount++;
          } else {
            evaluatedCount++;
            console.log(`Updated ${item.ticker}: ${evaluationStatus}`);
          }
        } else {
          // Create new evaluation
          const { error: insertError } = await supabase
            .from('watchlist_evaluations')
            .insert({
              watchlist_item_id: item.id,
              ticker: item.ticker,
              status: evaluationStatus,
              price_movement_percent: priceData.changePercent,
              price_movement_nominal: priceData.change,
              current_price: priceData.price,
              analysis_score: 0,
              analysis_direction: direction,
              timestamp: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`Error creating evaluation for ${item.ticker}:`, insertError);
            errorCount++;
          } else {
            evaluatedCount++;
            console.log(`Created evaluation for ${item.ticker}: ${evaluationStatus}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing ${item.ticker}:`, error);
        errorCount++;
      }
    }

    console.log(`Evaluation complete: ${evaluatedCount} evaluated, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Evaluated ${evaluatedCount} items`,
      evaluated: evaluatedCount,
      errors: errorCount,
      total: activeItems.length,
    });
  } catch (error) {
    console.error('Error in evaluate-watchlist cron:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
