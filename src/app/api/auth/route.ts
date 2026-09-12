import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_EMAILS = ['saniccha@gmail.com'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check user expiry
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      if (!isAdmin && supabaseServiceKey && data.user) {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Ensure user profile exists
        const { data: existingProfile } = await adminSupabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          await adminSupabase.from('user_profiles').insert({
            id: data.user.id,
            email: email,
          });
        } else {
          // Update email if missing
          await adminSupabase.from('user_profiles').update({ email }).eq('id', data.user.id);
        }

        // Check expiry
        const { data: profile } = await adminSupabase
          .from('user_profiles')
          .select('expires_at')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.expires_at) {
          const expiryDate = new Date(profile.expires_at);
          if (expiryDate < new Date()) {
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

    if (action === 'logout') {
      await supabase.auth.signOut();

      const response = NextResponse.json({ success: true });

      // Clear all auth-related cookies
      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
      ];

      for (const name of cookiesToClear) {
        response.cookies.set(name, '', {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 0,
        });
      }

      // Also clear Supabase internal cookies
      const { cookies } = request;
      for (const cookie of cookies.getAll()) {
        if (cookie.name.startsWith('sb-') || cookie.name.startsWith('supabase')) {
          response.cookies.set(cookie.name, '', {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 0,
          });
        }
      }

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
    );
  }
}
