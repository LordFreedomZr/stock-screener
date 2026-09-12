import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Singleton admin client
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accessToken = request.cookies.get('sb-access-token')?.value;
  let userId: string | null = null;
  let userEmail: string | null = null;

  if (user) {
    userId = user.id;
    userEmail = user.email || null;
  } else if (accessToken && accessToken.length > 0) {
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        userId = payload?.sub || null;
        userEmail = payload?.email || null;
      }
    } catch {}
  }

  const hasValidToken = !!userId;

  // Redirect to login if not authenticated
  if (
    !hasValidToken &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Check user expiry (skip for admin and auth routes)
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
    }
  }

  // Redirect authenticated users away from login
  if (hasValidToken && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
