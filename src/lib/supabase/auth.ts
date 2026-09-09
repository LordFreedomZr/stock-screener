import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  try {
    // First try: extract user from our custom sb-access-token cookie
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      try {
        const decoded = jwtDecode<{ sub: string }>(accessToken);
        if (decoded?.sub) return decoded.sub;
      } catch {
        // JWT decode failed, try other methods
      }
    }

    // Second try: use Supabase SSR with all cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  } catch {
    return null;
  }
}
