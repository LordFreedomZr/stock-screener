import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });

      for (const name of ['sb-access-token', 'sb-refresh-token']) {
        response.cookies.set(name, '', {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 0,
        });
      }

      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-') || cookie.name.startsWith('supabase')) {
          response.cookies.delete(cookie.name);
        }
      }

      return response;
    }

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    if (email.length > 255 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Input terlalu panjang' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const isAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase());

      if (!isAdmin && data.user) {
        const admin = getAdminClient();
        if (admin) {
          const { error: upsertError } = await admin
            .from('user_profiles')
            .upsert(
              { id: data.user.id, email: email.trim().toLowerCase() },
              { onConflict: 'id', ignoreDuplicates: false }
            );

          if (upsertError) {
            console.error('Profile upsert error:', upsertError);
          }

          const { data: profile } = await admin
            .from('user_profiles')
            .select('expires_at')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile?.expires_at && new Date(profile.expires_at) < new Date()) {
            return NextResponse.json(
              { success: false, error: 'Akun telah kedaluwarsa. Hubungi admin.' },
              { status: 403 }
            );
          }
        }
      }

      const response = NextResponse.json({ success: true, user: data.user });

      if (data.session) {
        response.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: data.session.expires_in,
        });
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Action tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
