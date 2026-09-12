import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isUserAdmin } from '@/lib/supabase/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const admin = getAdminClient();
    if (!admin) throw new Error('Service not configured');

    // Only admin can list all users
    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: profiles, error } = await admin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user emails from auth
    const { data: users } = await admin.auth.admin.listUsers();
    const userMap = new Map(users?.users?.map(u => [u.id, u.email]) || []);

    const result = (profiles || []).map(p => ({
      ...p,
      email: userMap.get(p.id) || p.email,
      is_expired: p.expires_at ? new Date(p.expires_at) < new Date() : false,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing users:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const admin = getAdminClient();
    if (!admin) throw new Error('Service not configured');

    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, expiresAt } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });
    }

    // Validate expiresAt is a valid date or null
    let expiryDate: string | null = null;
    if (expiresAt && expiresAt !== 'null') {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
      }
      expiryDate = parsed.toISOString();
    }

    // Upsert profile
    const { data, error } = await admin
      .from('user_profiles')
      .upsert(
        { id: targetUserId, expires_at: expiryDate, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: expiryDate
        ? `User akan expired pada ${new Date(expiryDate).toLocaleDateString('id-ID')}`
        : 'User tidak memiliki expiry (selalu aktif)',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating user expiry:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
