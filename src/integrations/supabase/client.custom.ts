// Custom Supabase client pointing to the user-owned Supabase project.
// This file is NOT auto-regenerated. It overrides the default client.ts
// so that the app uses the new project the user fully owns.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://arethozlhbxvfdtehfpm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'REPLACE_WITH_NEW_PROJECT_ANON_KEY';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
