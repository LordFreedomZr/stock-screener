import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin emails that never expire
const ADMIN_EMAILS = ['saniccha@gmail.com'];

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

export interface UserProfile {
  id: string;
  email: string | null;
  expires_at: string | null;
  is_admin: boolean;
  is_expired: boolean;
}

export async function getUserProfile(userId: string, email?: string): Promise<UserProfile> {
  const profile: UserProfile = {
    id: userId,
    email: email || null,
    expires_at: null,
    is_admin: false,
    is_expired: false,
  };

  // Check if admin
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    profile.is_admin = true;
    return profile;
  }

  // Check expiry from user_profiles table
  if (supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from('user_profiles')
        .select('expires_at, email')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        profile.email = data.email || email || null;
        profile.expires_at = data.expires_at;

        if (data.expires_at) {
          const expiryDate = new Date(data.expires_at);
          if (expiryDate < new Date()) {
            profile.is_expired = true;
          }
        }
      }
    } catch {
      // Table might not exist yet
    }
  }

  return profile;
}

export async function isUserExpired(userId: string): Promise<boolean> {
  if (!supabaseServiceKey) return false;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from('user_profiles')
      .select('expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (!data?.expires_at) return false;

    return new Date(data.expires_at) < new Date();
  } catch {
    return false;
  }
}
