'use server';

import { createSimpleServerClient } from '@/lib/supabase/server';
// Remove TourPackageBookingWithProduct import
import { TourPackageBookingSchema, type TourPackageBooking, type TourProduct, type TourPackageBookingWithProduct } from '@/lib/types/tours';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // Import crypto for random bytes

// --- Helper Type for Action State ---
interface FormState {
  message: string;
  errors?: Record<string, string[]>;
  fieldValues?: {
      [key: string]: string | number | null | undefined;
  };
}

// --- Helper Function for ID Generation ---
function generateAlphanumericId(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters.charAt(randomBytes[i] % characters.length);
  }
  return result;
}

// --- CREATE ---
export async function createTourPackageBooking(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());
  
  // Separate linked_booking_id and convert empty string to null
  const { linked_booking_id: rawLinkedId, ...otherRawData } = rawFormData;
  const processedLinkedId = rawLinkedId === '' ? null : rawLinkedId as string | null;
  
  const formDataForValidation = {
      ...otherRawData, // Spread the rest of the raw data
      linked_booking_id: processedLinkedId, // Add the processed value back
      // Coerce dates
      booking_date: otherRawData.booking_date ? new Date(otherRawData.booking_date as string) : null,
      travel_start_date: otherRawData.travel_start_date ? new Date(otherRawData.travel_start_date as string) : null,
      travel_end_date: otherRawData.travel_end_date ? new Date(otherRawData.travel_end_date as string) : null,
  };

  // Validate using the schema that expects optional/nullable UUID
  const validatedFields = TourPackageBookingSchema.safeParse(formDataForValidation);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    // Convert raw form data values to string for fieldValues
    const fieldValuesWithString = Object.fromEntries(
        Object.entries(rawFormData).map(([key, value]) => [key, String(value ?? '')])
    );
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      fieldValues: fieldValuesWithString, // Use the stringified values
    };
  }

  // Destructure validated data (including the new field)
  const { 
    customer_name, tour_product_id, price, pax, status, 
    booking_date, travel_start_date, travel_end_date, notes, 
    linked_booking_id // <-- Destructure new field
  } = validatedFields.data;

  // 2. Generate Unique 5-Character Alphanumeric ID
  let uniqueId = '';
  let attempts = 0;
  const maxAttempts = 5; // Prevent infinite loops in unlikely collision scenarios

  while (!uniqueId && attempts < maxAttempts) {
    attempts++;
    const potentialId = generateAlphanumericId(5);
    
    // Check if ID already exists (simple check)
    const { data: existing, error: checkError } = await supabase
      .from('tour_package_bookings')
      .select('id')
      .eq('id', potentialId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

    if (checkError) {
      console.error('Supabase ID Check Error:', checkError);
      // Decide how to handle: retry, fail, log? For now, we'll let it try again.
    }

    if (!existing && !checkError) {
      uniqueId = potentialId; // Found a unique ID
    } else if (existing) {
       console.warn(`ID collision detected for ${potentialId}, attempt ${attempts}. Regenerating...`);
    }
  }

  if (!uniqueId) {
    console.error(`Failed to generate a unique ID after ${maxAttempts} attempts.`);
    return { message: 'Database Error: Could not generate a unique booking ID. Please try again.' };
  }

  // 3. Prepare data for Supabase (including generated ID and potentially null linked ID)
  const dataToInsert = {
      id: uniqueId,
      customer_name,
      tour_product_id,
      price,
      pax,
      status,
      booking_date: booking_date?.toISOString(),
      travel_start_date: travel_start_date?.toISOString(),
      travel_end_date: travel_end_date?.toISOString(),
      notes,
      linked_booking_id: linked_booking_id, // Use validated data
  };

  // 4. Insert data into Supabase
  try {
    console.log('Attempting to insert tour booking:', dataToInsert);
    const { error } = await supabase
      .from('tour_package_bookings')
      .insert([dataToInsert]); // No .select() needed now

    if (error) {
      console.error('Supabase Insert Error:', error);
      // Check for potential duplicate key error if the uniqueness check somehow failed
      if (error.code === '23505') { // Unique violation
          return { message: `Database Error: Failed to create booking. The generated ID ${uniqueId} might already exist unexpectedly.` };
      }
      return { message: `Database Error: Failed to create tour booking. ${error.message}` };
    }

    console.log(`Tour booking ${uniqueId} created successfully.`);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not create tour booking.' };
  }

  // 5. Revalidate cache and return success
  revalidatePath('/tour-packages');
  return { message: `Successfully created tour booking ${uniqueId}!` };
}

// --- UPDATE ---
export async function updateTourPackageBooking(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  if (!id) return { message: 'Error: Missing booking ID for update.' };

  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());
  
  // Separate linked_booking_id and convert empty string to null
  const { linked_booking_id: rawLinkedId, ...otherRawData } = rawFormData;
  const processedLinkedId = rawLinkedId === '' ? null : rawLinkedId as string | null;
  
  const formDataForValidation = {
      ...otherRawData, // Spread the rest of the raw data
      linked_booking_id: processedLinkedId, // Add the processed value back
      // Coerce dates
      booking_date: otherRawData.booking_date ? new Date(otherRawData.booking_date as string) : null,
      travel_start_date: otherRawData.travel_start_date ? new Date(otherRawData.travel_start_date as string) : null,
      travel_end_date: otherRawData.travel_end_date ? new Date(otherRawData.travel_end_date as string) : null,
  };
  
  // Validate using the schema that expects optional/nullable UUID
  const validatedFields = TourPackageBookingSchema.safeParse(formDataForValidation);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    // Convert raw form data values to string for fieldValues
    const fieldValuesWithString = Object.fromEntries(
        Object.entries(rawFormData).map(([key, value]) => [key, String(value ?? '')])
    );
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      fieldValues: fieldValuesWithString, // Use the stringified values
    };
  }

  // Destructure validated data (including the new field)
  const { 
      customer_name, 
      tour_product_id, 
      price, 
      pax, // Get PAX
      status, 
      booking_date, 
      travel_start_date, 
      travel_end_date, 
      notes,
      linked_booking_id // <-- Destructure new field
  } = validatedFields.data;

  // 2. Prepare data for Supabase update
  const dataToUpdate = {
      customer_name,
      tour_product_id,
      price,
      pax, // Include PAX
      status,
      booking_date: booking_date?.toISOString(),
      travel_start_date: travel_start_date?.toISOString(),
      travel_end_date: travel_end_date?.toISOString(),
      notes,
      linked_booking_id: linked_booking_id, // Use validated data
      updated_at: new Date().toISOString(), // Update timestamp
  };

  // 3. Update data in Supabase
  try {
    console.log(`Attempting to update tour booking ${id}:`, dataToUpdate);
    const { error } = await supabase
      .from('tour_package_bookings')
      .update(dataToUpdate)
      .eq('id', id); // ID is already a string

    if (error) {
      console.error('Supabase Update Error:', error);
      return { message: `Database Error: Failed to update tour booking. ${error.message}` };
    }

    console.log(`Tour booking ${id} updated successfully.`);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not update tour booking.' };
  }

  // 4. Revalidate cache and return success
  revalidatePath('/tour-packages');
  revalidatePath(`/tour-packages/${id}/edit`);
  return { message: 'Successfully updated tour booking!' };
}

// --- DELETE ---
export async function deleteTourPackageBooking(id: string): Promise<{ message: string }> { // Changed back to string
  if (!id) {
    return { message: "Error: Missing booking ID for deletion." };
  }

  const supabase = createSimpleServerClient();

  try {
    const { error } = await supabase
      .from('tour_package_bookings')
      .delete()
      .eq('id', id); // ID is already a string

    if (error) {
      console.error("Supabase Delete Error:", error);
      // Provide more specific error feedback if possible
      if (error.code === '23503') { // Foreign key violation
          return { message: `Database Error: Cannot delete booking. It might be referenced elsewhere.` };
      }
      return { message: `Database Error: Failed to delete tour booking. ${error.message}` };
    }

    console.log(`Tour booking ${id} deleted successfully.`);
    
  } catch (error) {
    console.error("Unexpected Delete Error:", error);
    return { message: "Unexpected Error: Could not delete tour booking." };
  }

  // Revalidate relevant paths
  revalidatePath('/tour-packages');
  // Attempt to revalidate the specific page, though it might not exist anymore
  // Consider removing this or handling potential errors if revalidation fails
  try {
     revalidatePath(`/tour-packages/${id}`);
  } catch (revalError) {
     console.warn(`Could not revalidate path /tour-packages/${id} after deletion:`, revalError);
  }
  
  return { message: "Success: Tour booking deleted." };
}

// --- READ (for Server Components/Actions) ---

// Define the shape of the booking with the joined product name - MOVED TO types/tours.ts
/*
export interface TourPackageBookingWithProduct extends TourPackageBooking {
  tour_products: { name: string }[] | null;
}
*/

// Ensure the select includes the new field and explicitly lists others
export async function getTourPackageBookings(): Promise<TourPackageBookingWithProduct[]> {
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tour_package_bookings')
    .select(`
      id, customer_name, tour_product_id, price, pax, status, booking_date, travel_start_date, travel_end_date, notes, created_at, updated_at, 
      linked_booking_id,
      tour_products ( name )
    `)
    .order('created_at', { ascending: false })
    .order('booking_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Database Error fetching tour package bookings:', error);
    return [];
  }
  // Log the raw data structure returned by Supabase
  console.log("Raw data from getTourPackageBookings:", JSON.stringify(data, null, 2));
  
  // Type assertion should now be safer
  return (data as TourPackageBookingWithProduct[]) || [];
}

// Ensure the select includes the new field and explicitly lists others
export async function getTourPackageBookingById(id: string): Promise<TourPackageBookingWithProduct | null> {
  if (!id) return null;
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tour_package_bookings')
    .select(`
      id, customer_name, tour_product_id, price, pax, status, booking_date, travel_start_date, travel_end_date, notes, created_at, updated_at, 
      linked_booking_id,
      tour_products ( name )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Database Error fetching booking ${id}:`, error);
     if (error.code === 'PGRST116') { 
       return null; // Not found
     }
    return null;
  }
  // Type assertion should now be safer
  return data as TourPackageBookingWithProduct || null;
} 