'use server';

import { createClient } from '@/lib/supabase/server'; // Use the server client from @supabase/ssr setup
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function signOut() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); // Create client for server actions

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    // Optionally handle error, maybe redirect to an error page or return an error state
    // For now, we'll still attempt redirection
  }

  // Redirect to the home page after sign out
  return redirect('/'); 
} 