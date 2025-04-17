'use server';

import { z } from 'zod';
import { createSimpleServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Although we might just revalidate
import type { Customer } from '@/types/database';
import { customerSchema } from '@/lib/schemas'; // Import schema from the new location

// Zod schema for validating customer form data
// MOVED to src/lib/schemas.ts

export type CustomerFormState = {
  message: string | null;
  errors?: {
    company_name?: string[];
  };
};

// Server Action to add a new customer
export async function addCustomer(prevState: CustomerFormState | undefined, formData: FormData): Promise<CustomerFormState> {
  const validatedFields = customerSchema.safeParse({
    company_name: formData.get('company_name'),
  });

  // If form validation fails, return errors
  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const supabase = createSimpleServerClient();
  const { error } = await supabase
    .from('customers')
    .insert({ company_name: validatedFields.data.company_name });

  if (error) {
    console.error('Supabase error adding customer:', error);
    return { message: `Database Error: Failed to add customer. ${error.message}` };
  }

  // Revalidate the customers page to show the new customer
  revalidatePath('/customers');
  // Optional: redirect or just return success
  // redirect('/customers');
  return { message: 'Successfully added customer' };
}

// Server Action to update an existing customer
export async function updateCustomer(id: string, prevState: CustomerFormState | undefined, formData: FormData): Promise<CustomerFormState> {
  if (!id) return { message: 'Error: Missing customer ID for update.' };

  const validatedFields = customerSchema.safeParse({
    company_name: formData.get('company_name'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const supabase = createSimpleServerClient();
  const { error } = await supabase
    .from('customers')
    .update({ company_name: validatedFields.data.company_name })
    .eq('id', id);

  if (error) {
    console.error('Supabase error updating customer:', error);
    return { message: `Database Error: Failed to update customer. ${error.message}` };
  }

  revalidatePath('/customers');
  return { message: 'Successfully updated customer' };
}

// Server Action to delete a customer
export async function deleteCustomer(id: string): Promise<{ message: string | null }> {
  if (!id) return { message: 'Error: Missing customer ID for delete.' };

  const supabase = createSimpleServerClient();
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase error deleting customer:', error);
    // Check for foreign key constraint violation (if customer is linked to bookings)
    if (error.code === '23503') { // PostgreSQL foreign key violation code
        return { message: `Database Error: Cannot delete customer because they are associated with existing bookings.` };
    }
    return { message: `Database Error: Failed to delete customer. ${error.message}` };
  }

  revalidatePath('/customers');
  return { message: 'Successfully deleted customer' };
} 