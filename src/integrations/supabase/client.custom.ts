// Custom Supabase client pointing to the user-owned Supabase project.
// This file is NOT auto-regenerated. It overrides the default client.ts
// so that the app uses the new project the user fully owns.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://arethozlhbxvfdtehfpm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZXRob3psaGJ4dmZkdGVoZnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTU5NTgsImV4cCI6MjA5MjgzMTk1OH0.fuZtVWOk8DJz0GZpGvT8cw0fomNb7Mfj0DY3CTGKILc';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
