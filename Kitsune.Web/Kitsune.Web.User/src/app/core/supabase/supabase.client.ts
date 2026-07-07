import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

// Singleton Supabase client — shared across the entire User app.
// Do NOT create multiple instances (each instance opens its own realtime socket).
export const supabase: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.publishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
