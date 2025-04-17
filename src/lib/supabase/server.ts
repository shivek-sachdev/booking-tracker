import { createClient } from '@supabase/supabase-js';

// Define a simplified function to create a Supabase client for server-side data fetching
// This does NOT handle auth cookies and is suitable only for reading public data
// or data where RLS is not dependent on user auth.
// Replace with the proper @supabase/ssr implementation when auth is needed.
export function createSimpleServerClient() {
  // Ensure environment variables are loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing from environment variables.');
  }

  // Create and return the Supabase client
  // We pass { auth: { persistSession: false } } to prevent attempts to use localStorage
  // on the server.
  return createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
     }
  });
} 