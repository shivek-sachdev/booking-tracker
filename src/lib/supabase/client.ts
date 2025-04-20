'use client';

import { createBrowserClient } from '@supabase/ssr';

// Define a function to create the Supabase client for browser environments
export function createClient() {
  // Create a singleton Supabase client for interacting with your database
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} 