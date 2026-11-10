import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  if (!rawUrl || !rawAnonKey) return false;
  const trimmedUrl = rawUrl.trim();
  const trimmedKey = rawAnonKey.trim();
  if (
    !trimmedUrl ||
    !trimmedKey ||
    trimmedUrl === 'https://your-project-id.supabase.co' ||
    trimmedKey === 'your-supabase-anon-or-publishable-key' ||
    trimmedUrl.includes('MY_') ||
    trimmedKey.includes('MY_')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(rawUrl!.trim(), rawAnonKey!.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
