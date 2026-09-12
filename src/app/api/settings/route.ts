import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/supabase/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function validateNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || isNaN(value)) return null;
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const admin = getAdminClient();
    if (!admin) throw new Error('Service not configured');

    const { data, error } = await admin
      .from('threshold_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const admin = getAdminClient();
    if (!admin) throw new Error('Service not configured');

    const body = await request.json();

    // Validate inputs
    const config = {
      version: typeof body.version === 'string' ? body.version : '1.0.0',
      rsi_oversold: validateNumber(body.rsi_oversold, 10, 50) ?? 30,
      rsi_overbought: validateNumber(body.rsi_overbought, 50, 90) ?? 70,
      atr_min_percent: validateNumber(body.atr_min_percent, 0, 10) ?? 1,
      atr_max_percent: validateNumber(body.atr_max_percent, 5, 50) ?? 10,
      volume_min_turnover: validateNumber(body.volume_min_turnover, 0, 1000000000) ?? 100000000,
      rvol_threshold: validateNumber(body.rvol_threshold, 0.5, 5) ?? 1.5,
      weight_momentum: validateNumber(body.weight_momentum, 0, 100) ?? 60,
      weight_volume: validateNumber(body.weight_volume, 0, 100) ?? 40,
    };

    // Upsert config
    const { data: existing } = await admin
      .from('threshold_configs')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await admin
        .from('threshold_configs')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await admin
        .from('threshold_configs')
        .insert({ ...config, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      data: { ...result, enabled_indicators: body.enabled_indicators || [] },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
