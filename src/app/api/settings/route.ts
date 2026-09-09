import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);

    let query = supabase
      .from('threshold_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    // Filter by user_id if logged in, otherwise get global config
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await getCurrentUser(request);

    // Check if user already has a config
    let existingConfig = null;
    if (userId) {
      const { data } = await supabase
        .from('threshold_configs')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      existingConfig = data;
    }

    let result;

    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from('threshold_configs')
        .update({
          version: body.version || '1.0.0',
          rsi_oversold: body.rsi_oversold,
          rsi_overbought: body.rsi_overbought,
          atr_min_percent: body.atr_min_percent,
          atr_max_percent: body.atr_max_percent,
          volume_min_turnover: body.volume_min_turnover,
          rvol_threshold: body.rvol_threshold,
          weight_momentum: body.weight_momentum,
          weight_volume: body.weight_volume,
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new config
      const { data, error } = await supabase
        .from('threshold_configs')
        .insert({
          version: body.version || '1.0.0',
          rsi_oversold: body.rsi_oversold,
          rsi_overbought: body.rsi_overbought,
          atr_min_percent: body.atr_min_percent,
          atr_max_percent: body.atr_max_percent,
          volume_min_turnover: body.volume_min_turnover,
          rvol_threshold: body.rvol_threshold,
          weight_momentum: body.weight_momentum,
          weight_volume: body.weight_volume,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
