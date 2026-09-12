import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase/auth';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    if (!userId) {
      return NextResponse.json({ success: false, expired: true }, { status: 401 });
    }

    // Admin never expires
    const supabase = createClient(supabaseUrl, supabaseServiceKey || '');
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user?.email && ADMIN_EMAILS.includes(userData.user.email.toLowerCase())) {
      return NextResponse.json({ success: true, expired: false });
    }

    // Check expiry
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.expires_at) {
      return NextResponse.json({ success: true, expired: false });
    }

    const isExpired = new Date(profile.expires_at) < new Date();
    return NextResponse.json({ success: true, expired: isExpired });
  } catch {
    return NextResponse.json({ success: true, expired: false });
  }
}
