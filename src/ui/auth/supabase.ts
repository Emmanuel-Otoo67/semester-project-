import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const localDevelopmentMode = import.meta.env.VITE_LIBTRACK_LOCAL_DEV === 'true';
export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase = !localDevelopmentMode && supabaseConfigured ? createClient(url!, publishableKey!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
