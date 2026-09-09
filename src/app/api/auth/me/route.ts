import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies and find sb-access-token
    const cookies = request.cookies.getAll();
    const accessTokenCookie = cookies.find((c) => c.name === 'sb-access-token');

    if (!accessTokenCookie?.value) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const token = accessTokenCookie.value;

    // Decode JWT to get user ID (sub claim)
    let userId: string | null = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        userId = payload.sub;
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Use service role to fetch user email
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !userData?.user?.email) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: userData.user.email,
        id: userId,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
