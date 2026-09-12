import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    if (!userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ success: true });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    
    await admin.from('user_profiles').upsert({
      id: userId,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'id' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
