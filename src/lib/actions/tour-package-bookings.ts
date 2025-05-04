'use server';

import { createSimpleServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js'; // <-- Import base client creator
import { TourPackageBookingSchema, type TourPackageBooking, type TourProduct, type TourPackageBookingWithProduct, type PaymentRecord, TourPackageStatusEnum } from '@/lib/types/tours';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // Import crypto for random bytes
import { z } from 'zod';
// import { toast } from 'react-hot-toast'; // <-- REMOVE: Cannot use client-side toast in server action

// --- Helper Type for Action State ---
interface FormState {
  message: string;
  bookingId?: string; // <-- Add optional bookingId
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
  
  const { linked_booking_id: rawLinkedId, ...otherRawData } = rawFormData;
  const processedLinkedId = rawLinkedId === '' ? null : rawLinkedId as string | null;
  
  const formDataForValidation = {
      ...otherRawData,
      linked_booking_id: processedLinkedId,
      // Coerce dates
      booking_date: otherRawData.booking_date ? new Date(otherRawData.booking_date as string) : null,
      travel_start_date: otherRawData.travel_start_date ? new Date(otherRawData.travel_start_date as string) : null,
      travel_end_date: otherRawData.travel_end_date ? new Date(otherRawData.travel_end_date as string) : null,
  };
  
  // Validate using the schema (which no longer includes payment_slip_path)
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

  // Destructure validated data
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
      linked_booking_id
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
      linked_booking_id: linked_booking_id,
      updated_at: new Date().toISOString(),
  };

  // 3. Update data in Supabase
  try {
    console.log(`Attempting to update tour booking ${id}:`, dataToUpdate);
    const { error } = await supabase
      .from('tour_package_bookings')
      .update(dataToUpdate)
      .eq('id', id);

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
  revalidatePath(`/tour-packages/${id}`); // Revalidate detail page too
  return { message: 'Successfully updated tour booking!' };
}

// --- ADD PAYMENT RECORD ---
const AddPaymentSchema = z.object({
    bookingId: z.string().length(5), // Assuming booking ID is always 5 chars
    status: TourPackageStatusEnum, // Validate against the enum
    slipPath: z.string().min(1, { message: "Payment slip path cannot be empty." })
});

export async function addPaymentRecord(
    bookingId: string,
    status: string, 
    slipPath: string
): Promise<{ success: boolean; message: string; paymentId?: string }> {
    
    const validation = AddPaymentSchema.safeParse({ bookingId, status, slipPath });

    if (!validation.success) {
        console.error("Add Payment Validation Error:", validation.error.flatten());
        return { success: false, message: `Invalid input: ${validation.error.flatten().fieldErrors}` };
    }

    // Log the validated data being used
    console.log('[addPaymentRecord] Validated Data:', validation.data);

    // Create Service Role Client
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, 
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // Check if URL and Key seem loaded (don't log the key itself)
    console.log('[addPaymentRecord] Supabase Admin Client Initialized with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'MISSING');
    console.log('[addPaymentRecord] Supabase Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING');

    try {
        // --- Explicitly check if booking exists using Admin client --- 
        const { data: bookingCheck, error: bookingCheckError } = await supabaseAdmin
            .from('tour_package_bookings')
            .select('id')
            .eq('id', validation.data.bookingId)
            .maybeSingle();

        if (bookingCheckError) {
            console.error('[addPaymentRecord] Error checking booking existence:', bookingCheckError);
            return { success: false, message: `Database Error: Failed check booking existence. ${bookingCheckError.message}` };
        }
        if (!bookingCheck) {
            console.error(`[addPaymentRecord] Booking with ID ${validation.data.bookingId} not found! Cannot add payment record.`);
            return { success: false, message: `Database Error: Booking with ID ${validation.data.bookingId} not found.` };
        }
        console.log(`[addPaymentRecord] Confirmed booking ${validation.data.bookingId} exists.`);
        // -------------------------------------------------------------

        // Use the admin client for the insert
        console.log('[addPaymentRecord] Attempting insert into payments...');
        const { data, error } = await supabaseAdmin
            .from('payments')
            .insert({
                tour_package_booking_id: validation.data.bookingId,
                status_at_payment: validation.data.status,
                payment_slip_path: validation.data.slipPath
            })
            .select('id')
            .single();

        if (error) {
            // Log the specific error here again
            console.error('[addPaymentRecord] Supabase Add Payment Error:', error);
            return { success: false, message: `Database Error: Failed to add payment record. ${error.message}` };
        }

        console.log(`Payment record ${data.id} added for booking ${bookingId}.`);
        revalidatePath(`/tour-packages/${bookingId}`);
        return { success: true, message: 'Payment record added successfully.', paymentId: data.id };

    } catch (error) {
        console.error('Unexpected Add Payment Error:', error);
        return { success: false, message: 'Unexpected Error: Could not add payment record.' };
    }
}

// --- DELETE PAYMENT RECORD ---
export async function deletePaymentRecord(
    paymentId: string
): Promise<{ success: boolean; message: string }> {
    if (!paymentId) {
        return { success: false, message: 'Error: Missing payment ID for deletion.' };
    }

    // Use service role client here too if needed, especially for storage operations
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // 1. Get the payment record to find the file path and booking ID
        // Use admin client
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('id, payment_slip_path, tour_package_booking_id')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            console.error('Fetch Payment Error:', fetchError);
            return { success: false, message: `Database Error: Could not find payment record ${paymentId}. ${fetchError?.message ?? ''}` };
        }

        // 2. Delete the file from storage
        console.log(`Attempting to delete storage object: ${payment.payment_slip_path}`);
        // Use admin client
        const { error: storageError } = await supabaseAdmin.storage
            .from('payment-slips') // Ensure this matches your bucket name
            .remove([payment.payment_slip_path]);

        if (storageError) {
            console.error('Supabase Storage Deletion Error:', storageError);
            // Decide how to handle error - log and continue for now
        }

        // 3. Delete the payment record from the database
        // Use admin client
        const { error: dbError } = await supabaseAdmin
            .from('payments')
            .delete()
            .eq('id', paymentId);

        if (dbError) {
            console.error('Supabase DB Deletion Error:', dbError);
            return { success: false, message: `Database Error: Failed to delete payment record. ${dbError.message}` };
        }

        console.log(`Payment record ${paymentId} deleted successfully.`);
        revalidatePath(`/tour-packages/${payment.tour_package_booking_id}`);
        return { success: true, message: 'Payment record deleted successfully.' };

    } catch (error) {
        console.error('Unexpected Delete Payment Error:', error);
        return { success: false, message: 'Unexpected Error: Could not delete payment record.' };
    }
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
  console.log("Raw data from getTourPackageBookings:", JSON.stringify(data, null, 2));
  
  // Use safer type assertion
  return (data as unknown as TourPackageBookingWithProduct[]) || [];
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
  console.log(`[getTourPackageBookingById] Raw data for ${id}:`, JSON.stringify(data, null, 2));

  // Use safer type assertion
  return (data as unknown as TourPackageBookingWithProduct) || null;
}

// --- NEW: READ Payments for a Booking ---
export async function getPaymentsForBooking(bookingId: string): Promise<PaymentRecord[]> {
    if (!bookingId) return [];
    const supabase = createSimpleServerClient();
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tour_package_booking_id', bookingId)
        .order('uploaded_at', { ascending: false }); // Show newest first

    if (error) {
        console.error(`Database Error fetching payments for booking ${bookingId}:`, error);
        return [];
    }
    return data || [];
}

// --- CREATE SIGNED URL FOR PAYMENT SLIP ---
export async function createPaymentSlipSignedUrl(
    slipPath: string
): Promise<{ success: boolean; url?: string; message: string }> {
    if (!slipPath) {
        return { success: false, message: 'Error: Missing payment slip path.' };
    }

    // Use service role client to ensure permission to create signed URL
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        const expiresIn = 60; // URL expires in 60 seconds
        const { data, error } = await supabaseAdmin.storage
            .from('payment-slips') // Ensure this matches your bucket name
            .createSignedUrl(slipPath, expiresIn);

        if (error) {
            console.error('Supabase Create Signed URL Error:', error);
            return { success: false, message: `Storage Error: Could not create signed URL. ${error.message}` };
        }

        if (!data?.signedUrl) {
            console.error('Signed URL missing from successful Supabase response.');
            return { success: false, message: 'Storage Error: Signed URL generation failed unexpectedly.' };
        }

        console.log(`Generated signed URL for ${slipPath}, expires in ${expiresIn}s.`);
        return { success: true, url: data.signedUrl, message: 'Signed URL created.' };

    } catch (error) {
        console.error('Unexpected Create Signed URL Error:', error);
        return { success: false, message: 'Unexpected Error: Could not create signed URL.' };
    }
}

// --- NEW: READ Payments for Ledger ---
import type { PaymentLedgerItem } from '@/lib/types/tours';

export async function getAllPaymentRecords(): Promise<PaymentLedgerItem[]> {
    // Use service role to ensure we can join across tables even if RLS is on them
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
        .from('payments')
        .select(`
            id,
            uploaded_at,
            status_at_payment,
            payment_slip_path,
            tour_package_booking_id,
            tour_package_bookings!fk_tour_package_booking (
                customer_name,
                tour_products (
                    name
                )
            )
        `)
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error('Database Error fetching payment ledger data:', error);
        return [];
    }

    // Manually map the data to the PaymentLedgerItem structure
    const ledgerData: PaymentLedgerItem[] = data.map((item: any) => ({
        id: item.id,
        uploaded_at: item.uploaded_at,
        status_at_payment: item.status_at_payment,
        payment_slip_path: item.payment_slip_path,
        tour_package_booking_id: item.tour_package_booking_id,
        customer_name: item.tour_package_bookings?.customer_name ?? null,
        package_name: item.tour_package_bookings?.tour_products?.name ?? null,
    }));

    return ledgerData;
} 