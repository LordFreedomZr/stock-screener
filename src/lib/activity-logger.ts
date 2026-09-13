import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logActivity(params: {
  user_id?: string;
  user_email?: string;
  action: string;
  detail?: string;
}) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: params.user_id || null,
      user_email: params.user_email || null,
      action: params.action,
      detail: params.detail || null,
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}
