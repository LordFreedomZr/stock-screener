import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function parseJwtPayload(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      const payload = parseJwtPayload(accessToken);
      if (payload?.sub) return payload.sub;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getCurrentUser(request);
  if (!userId) throw new Error('UNAUTHORIZED');
  return userId;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!supabaseServiceKey) return false;
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ? ADMIN_EMAILS.includes(data.user.email.toLowerCase()) : false;
  } catch {
    return false;
  }
}
