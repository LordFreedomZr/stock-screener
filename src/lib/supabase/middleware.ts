import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_EMAILS = ['saniccha@gmail.com'];

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

  // Try to get user from Supabase session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Also check for our custom access token cookie
  const accessToken = request.cookies.get('sb-access-token')?.value;
  
  // Extract user ID from JWT
  let userId: string | null = null;
  let userEmail: string | null = null;
  
  if (user) {
    userId = user.id;
    userEmail = user.email || null;
  } else if (accessToken && accessToken.length > 0) {
    try {
      const decoded = jwtDecode<{ sub: string; email?: string }>(accessToken);
      userId = decoded?.sub || null;
      userEmail = decoded?.email || null;
    } catch {}
  }

  const hasValidToken = !!userId;

  if (
    !hasValidToken &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Check user expiry (skip for admin users and API auth routes)
  if (userId && !request.nextUrl.pathname.startsWith('/api/auth')) {
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());
    
    if (!isAdmin && supabaseServiceKey) {
      try {
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseServiceKey
        );
        const { data: profile } = await adminSupabase
          .from('user_profiles')
          .select('expires_at')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.expires_at) {
          const expiryDate = new Date(profile.expires_at);
          if (expiryDate < new Date()) {
            // User is expired - redirect to login with error
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('error', 'expired');
            // Clear auth cookies
            const response = NextResponse.redirect(url);
            response.cookies.delete('sb-access-token');
            response.cookies.delete('sb-refresh-token');
            return response;
          }
        }
      } catch {
        // Table might not exist yet, continue
      }
    }
  }

  if (hasValidToken && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
