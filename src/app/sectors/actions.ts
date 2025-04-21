'use server';

import { createSimpleServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { predefinedSectorSchema } from '@/lib/schemas';

export type SectorFormState = {
  message: string | null;
  errors?: {
    origin_code?: string[];
    destination_code?: string[];
    description?: string[];
  };
};

interface FormActionResult {
  success: boolean;
  message: string;
}

interface DeleteResult {
  success: boolean;
  message: string;
}

export async function addSector(prevState: SectorFormState | undefined, formData: FormData): Promise<SectorFormState> {
  const supabase = createSimpleServerClient();

  const validatedFields = predefinedSectorSchema.safeParse({
    origin_code: formData.get('origin_code'),
    destination_code: formData.get('destination_code'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return { 
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from('predefined_sectors')
    .insert({
        origin_code: validatedFields.data.origin_code,
        destination_code: validatedFields.data.destination_code,
        description: validatedFields.data.description,
    });

  if (error) {
    console.error('Supabase error adding sector:', error);
    if (error.code === '23505') { // PostgreSQL unique violation code
      return { message: `Database Error: A sector with origin ${validatedFields.data.origin_code} and destination ${validatedFields.data.destination_code} already exists.` };
    }
    return { message: `Database Error: Failed to add sector. ${error.message}` };
  }

  revalidatePath('/sectors');
  return { message: 'Successfully added sector' };
}

export async function updateSector(id: string, prevState: SectorFormState | undefined, formData: FormData): Promise<SectorFormState> {
  if (!id) return { message: 'Error: Missing sector ID for update.' };

  const supabase = createSimpleServerClient();

  const validatedFields = predefinedSectorSchema.safeParse({
    origin_code: formData.get('origin_code'),
    destination_code: formData.get('destination_code'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return { 
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from('predefined_sectors')
    .update({
        origin_code: validatedFields.data.origin_code,
        destination_code: validatedFields.data.destination_code,
        description: validatedFields.data.description,
    })
    .eq('id', id);

  if (error) {
    console.error('Supabase error updating sector:', error);
     if (error.code === '23505') {
      return { message: `Database Error: A sector with origin ${validatedFields.data.origin_code} and destination ${validatedFields.data.destination_code} already exists.` };
    }
    return { message: `Database Error: Failed to update sector. ${error.message}` };
  }

  revalidatePath('/sectors');
  return { message: 'Successfully updated sector' };
}

export async function deleteSector(id: string): Promise<{ message: string | null }> {
  if (!id) return { message: 'Error: Missing sector ID for delete.' };

  const supabase = createSimpleServerClient();

  const { error } = await supabase
    .from('predefined_sectors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase error deleting sector:', error);
    if (error.code === '23503') { // Foreign key violation
        return { message: `Database Error: Cannot delete sector because it is associated with existing booking sectors.` };
    }
    return { message: `Database Error: Failed to delete sector. ${error.message}` };
  }

  revalidatePath('/sectors');
  return { message: 'Successfully deleted sector' };
} 