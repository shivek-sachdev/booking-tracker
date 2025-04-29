'use server';

import { revalidatePath } from 'next/cache';
import { createSimpleServerClient } from '@/lib/supabase/server';
import { fareClassSchema } from '@/lib/schemas';

// Type for the form state used by useFormState
export type FareClassFormState = {
  message: string | null;
  errors?: {
    name?: string[];
    description?: string[]; // Although not validated strictly, might have general errors
  };
  fareClassId?: string; // Include ID on success for potential use
};

// --- Add Fare Class ---
export async function addFareClass(
  prevState: FareClassFormState | undefined, 
  formData: FormData
): Promise<FareClassFormState> {
  const validatedFields = fareClassSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'), // Zod handles optional/nullable
  });

  if (!validatedFields.success) {
    console.log("Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validatedFields.data;
  const supabase = createSimpleServerClient();

  try {
    // Check for existing name (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('fare_classes')
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (checkError) {
      console.error("Supabase check error:", checkError);
      return { message: `Database Error: ${checkError.message}` };
    }
    if (existing) {
      return {
        message: 'Validation failed',
        errors: { name: ['This fare class name is already taken.'] }
      };
    }

    // Insert new fare class
    const { data: newFareClass, error: insertError } = await supabase
      .from('fare_classes')
      .insert({
        name,
        description: description || null, // Ensure null if empty string passed
        updated_at: new Date().toISOString(), 
      })
      .select('id') 
      .single(); 

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return { message: `Database Error: Failed to add fare class. ${insertError.message}` };
    }

    if (!newFareClass?.id) {
      return { message: 'Database Error: Failed to retrieve ID after insert.' };
    }

    revalidatePath('/fares');
    return { message: 'Successfully added fare class', fareClassId: newFareClass.id };

  } catch (error) {
    console.error("Unexpected error adding fare class:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { message: `Unexpected Error: ${errorMessage}` };
  }
}

// --- Update Fare Class ---
export async function updateFareClass(
  id: string, 
  prevState: FareClassFormState | undefined, 
  formData: FormData
): Promise<FareClassFormState> {
  if (!id) return { message: 'Error: Missing fare class ID for update.' };

  const validatedFields = fareClassSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validatedFields.data;
  const supabase = createSimpleServerClient();

  try {
     // Check if another fare class (excluding the current one) has the same name
    const { data: existing, error: checkError } = await supabase
      .from('fare_classes')
      .select('id')
      .ilike('name', name)
      .not('id', 'eq', id)
      .maybeSingle();
      
    if (checkError) {
      console.error("Supabase check error:", checkError);
      return { message: `Database Error: ${checkError.message}` };
    }
    if (existing) {
      return {
        message: 'Validation failed',
        errors: { name: ['Another fare class with this name already exists.'] }
      };
    }

    // Update the fare class
    const { error: updateError } = await supabase
      .from('fare_classes')
      .update({
        name,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return { message: `Database Error: Failed to update fare class. ${updateError.message}` };
    }

    revalidatePath('/fares');
    return { message: 'Successfully updated fare class', fareClassId: id };

  } catch (error) {
    console.error("Unexpected error updating fare class:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { message: `Unexpected Error: ${errorMessage}` };
  }
}

// --- Delete Fare Class ---
export async function deleteFareClass(id: string): Promise<{ message: string | null }> {
  if (!id) return { message: 'Error: Missing fare class ID for delete.' };

  const supabase = createSimpleServerClient();
  const { error } = await supabase
    .from('fare_classes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase error deleting fare class:', error);
    if (error.code === '23503') { 
        return { message: `Database Error: Cannot delete fare class as it is linked to booking sectors.` };
    }
    return { message: `Database Error: Failed to delete fare class. ${error.message}` };
  }

  revalidatePath('/fares');
  return { message: 'Successfully deleted fare class' };
} 