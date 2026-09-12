import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!adminClient && supabaseServiceKey) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey
    );
  }
  return adminClient;
}

function parseJwt(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;

  let userId: string | null = null;
  let userEmail: string | null = null;

  if (accessToken && accessToken.length > 0) {
    const payload = parseJwt(accessToken);
    if (payload?.sub) {
      userId = payload.sub;
      userEmail = payload.email || null;
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        userId = null;
        userEmail = null;
      }
    }
  }

  const hasValidToken = !!userId;

  if (
    !hasValidToken &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }

  if (userId && !request.nextUrl.pathname.startsWith('/api/auth')) {
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      const admin = getAdminClient();
      if (admin) {
        try {
          const { data: profile } = await admin
            .from('user_profiles')
            .select('expires_at')
            .eq('id', userId)
            .maybeSingle();

          if (profile && (profile as { expires_at?: string }).expires_at) {
            if (new Date((profile as { expires_at: string }).expires_at) < new Date()) {
              const url = request.nextUrl.clone();
              url.pathname = '/login';
              url.searchParams.set('error', 'expired');
              const response = NextResponse.redirect(url);
              response.cookies.delete('sb-access-token');
              response.cookies.delete('sb-refresh-token');
              return response;
            }
          }
        } catch {
          // user_profiles table might not exist yet
        }
      }

      if (request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  if (hasValidToken && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
