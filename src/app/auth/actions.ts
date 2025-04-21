'use server';

import { createSimpleServerClient } from '@/lib/supabase/server'; // Use the simple server client
import { redirect } from 'next/navigation';

export async function signOut() {
  // Use the simple server client that doesn't rely on cookies
  const supabase = createSimpleServerClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    // Optionally handle error, maybe redirect to an error page or return an error state
    // For now, we'll still attempt redirection
  }

  // Redirect to the home page after sign out
  return redirect('/'); 
} 