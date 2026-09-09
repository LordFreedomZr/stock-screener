import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
