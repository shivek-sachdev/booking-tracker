import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { createClient as createAnonClient } from '@supabase/supabase-js'; // Rename base client import

// New client for Server Actions/Route Handlers (using cookies)
export function createClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

// Original client for simple anonymous server-side reads (e.g., in Server Components)
// Renamed the base import to avoid conflict
export function createSimpleServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing from environment variables.');
  }

  // Create and return the basic Supabase client for anonymous access
  return createAnonClient(supabaseUrl, supabaseAnonKey, {
     auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
     }
  });
} 