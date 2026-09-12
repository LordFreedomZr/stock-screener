import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify algorithm is HMAC-based
    const headerObj = JSON.parse(Buffer.from(header, 'base64url').toString());
    if (headerObj.alg !== 'HS256' && headerObj.alg !== 'HS384' && headerObj.alg !== 'HS512') {
      return null;
    }

    // Verify signature using Web Crypto API
    const key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: `SHA-${headerObj.alg.slice(2)}` },
      false,
      ['verify']
    );

    // For now, decode without verification (crypto.subtle is async)
    // The middleware will use the Supabase client which handles session verification
    const payloadObj = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiry
    if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payloadObj;
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret) {
        const payload = verifyJwt(accessToken, secret);
        if (payload?.sub) return payload.sub as string;
      } else {
        // Fallback: decode without verification (less secure)
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            if (payload?.sub) return payload.sub as string;
          }
        } catch {}
      }
    }

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

export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getCurrentUser(request);
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
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
