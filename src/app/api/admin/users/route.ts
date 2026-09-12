import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isUserAdmin } from '@/lib/supabase/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: List all users with profiles
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const admin = getAdminClient();
    if (!admin) throw new Error('Service not configured');

    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get all auth users
    const { data: users } = await admin.auth.admin.listUsers();
    const authUsers = users?.users || [];

    // Get all profiles
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('*');

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const result = authUsers.map(u => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_seen: profile?.last_seen || null,
        expires_at: profile?.expires_at || null,
        is_expired: profile?.expires_at ? new Date(profile.expires_at) < new Date() : false,
        is_online: profile?.last_seen ? (Date.now() - new Date(profile.last_seen).getTime()) < 5 * 60 * 1000 : false,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing users:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

// POST: Create new user or update expiry
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
    const { action } = body;

    // Create new user
    if (action === 'create') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email dan password harus diisi' }, { status: 400 });
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) throw error;

      // Create profile
      await admin.from('user_profiles').upsert({
        id: data.user.id,
        email: email.toLowerCase(),
      }, { onConflict: 'id' });

      return NextResponse.json({
        success: true,
        data: { id: data.user.id, email },
        message: `User ${email} berhasil dibuat`,
      });
    }

    // Update expiry
    if (action === 'update_expiry') {
      const { targetUserId, expiresAt } = body;
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });
      }

      let expiryDate: string | null = null;
      if (expiresAt && expiresAt !== 'null' && expiresAt !== '') {
        const parsed = new Date(expiresAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ success: false, error: 'Format tanggal tidak valid' }, { status: 400 });
        }
        expiryDate = parsed.toISOString();
      }

      const { error } = await admin
        .from('user_profiles')
        .upsert(
          { id: targetUserId, expires_at: expiryDate, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: expiryDate
          ? `User akan expired pada ${new Date(expiryDate).toLocaleDateString('id-ID')}`
          : 'Expiry dihapus (selalu aktif)',
      });
    }

    // Delete user
    if (action === 'delete') {
      const { targetUserId } = body;
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });
      }

      // Don't allow deleting yourself
      if (targetUserId === userId) {
        return NextResponse.json({ success: false, error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
      }

      const { error } = await admin.auth.admin.deleteUser(targetUserId);
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'User berhasil dihapus' });
    }

    return NextResponse.json({ success: false, error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
