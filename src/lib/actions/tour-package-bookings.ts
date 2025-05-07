'use server';

import { createSimpleServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js'; // <-- Import base client creator
import { TourPackageBookingSchema, type TourPackageBooking, type TourProduct, type TourPackageBookingWithProduct, type PaymentRecord, TourPackageStatusEnum } from '@/lib/types/tours';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // Import crypto for random bytes
import { z } from 'zod';
import { Mistral } from '@mistralai/mistralai'; // <-- Import Mistral
import path from 'path'; // Import path for getting extension
// import { toast } from 'react-hot-toast'; // <-- REMOVE: Cannot use client-side toast in server action

// --- Helper Type for Action State ---
interface FormState {
  message: string;
  bookingId?: string; // Include bookingId for create success
  errors?: Record<string, string[]>;
  fieldValues?: { 
      // Keep string values for re-populating form
      [key: string]: string | undefined;
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
  formData: FormData
): Promise<FormState> {
  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());
  
  // Extract and parse addons JSON
  const addonsString = rawFormData.addons as string || '[]';
  let parsedAddons: Array<{ id: string; name: string; amount: number }> = [];
  try {
    parsedAddons = JSON.parse(addonsString);
    if (!Array.isArray(parsedAddons)) throw new Error("Addons is not an array");
    // Further validation can be done via Zod
  } catch (e) {
      console.error("Failed to parse addons JSON:", e);
      return {
          message: 'Invalid format for additional costs data.',
          errors: { addons: ['Invalid add-ons data submitted.'] }
      };
  }
  
  // Separate linked_booking_id and convert empty string to null
  const { 
      linked_booking_id: rawLinkedId, 
      addons: rawAddons, // Exclude raw addons string
      base_price_per_pax: rawBasePrice, // Handle base price coercion
      pax: rawPax, // Handle pax coercion
      ...otherRawData 
  } = rawFormData;

  const processedLinkedId = rawLinkedId === '' ? null : rawLinkedId as string | null;
  
  // Prepare object for Zod validation
  const formDataForValidation = {
      ...otherRawData, 
      linked_booking_id: processedLinkedId, 
      // Add parsed addons
      addons: parsedAddons, 
      // Coerce numbers and dates
      base_price_per_pax: rawBasePrice === null || rawBasePrice === undefined || rawBasePrice === '' ? null : Number(rawBasePrice),
      pax: rawPax === null || rawPax === undefined || rawPax === '' ? null : Number(rawPax),
      booking_date: otherRawData.booking_date ? new Date(otherRawData.booking_date as string) : null,
      travel_start_date: otherRawData.travel_start_date ? new Date(otherRawData.travel_start_date as string) : null,
      travel_end_date: otherRawData.travel_end_date ? new Date(otherRawData.travel_end_date as string) : null,
  };

  const validatedFields = TourPackageBookingSchema.safeParse(formDataForValidation);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    const fieldValuesWithString = Object.fromEntries(
        Object.entries(rawFormData).map(([key, value]) => [key, String(value ?? '')])
    );
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      fieldValues: fieldValuesWithString,
    };
  }

  // Destructure validated data (including base_price_per_pax and addons)
  const { 
    customer_name, tour_product_id, base_price_per_pax, addons, pax, status, 
    booking_date, travel_start_date, travel_end_date, notes, 
    linked_booking_id
  } = validatedFields.data;

  // --- Server-side Calculation --- 
  const addonsTotal = addons.reduce((sum, item) => sum + item.amount, 0);
  const baseSubtotal = (base_price_per_pax ?? 0) * pax;
  const grandTotal = baseSubtotal + addonsTotal;
  
  // For backward compatibility, still compute total_per_pax but don't use it in grand total
  const totalPerPax = (base_price_per_pax ?? 0);
  // --- End Calculation ---

  // 2. Generate Unique 5-Character Alphanumeric ID
  let uniqueId = '';
  let attempts = 0;
  const maxAttempts = 5;
  while (!uniqueId && attempts < maxAttempts) { 
      attempts++;
      const potentialId = generateAlphanumericId(5);
      const { data: existing, error: checkError } = await supabase.from('tour_package_bookings').select('id').eq('id', potentialId).maybeSingle();
      if (checkError) console.error('Supabase ID Check Error:', checkError);
      if (!existing && !checkError) uniqueId = potentialId;
      else if (existing) console.warn(`ID collision detected for ${potentialId}, attempt ${attempts}. Regenerating...`);
  }
  if (!uniqueId) return { message: 'Database Error: Could not generate a unique booking ID. Please try again.' };

  // 3. Prepare data for Supabase (including calculated totals and addons)
  const dataToInsert = {
      id: uniqueId,
      customer_name,
      tour_product_id,
      base_price_per_pax: base_price_per_pax ?? 0, // Default null base price to 0
      pax,
      status,
      addons, // Pass the parsed addons array
      total_per_pax: totalPerPax,
      grand_total: grandTotal,
      booking_date: booking_date?.toISOString(),
      travel_start_date: travel_start_date?.toISOString(),
      travel_end_date: travel_end_date?.toISOString(),
      notes,
      linked_booking_id,
  };

  // 4. Insert data into Supabase
  try {
    console.log('Attempting to insert tour booking:', dataToInsert);
    const { error } = await supabase
      .from('tour_package_bookings')
      .insert(dataToInsert); // Use insert with single object

    if (error) {
      console.error('Supabase Insert Error:', error);
      if (error.code === '23505') return { message: `Database Error: Failed to create booking. The generated ID ${uniqueId} might already exist unexpectedly.` };
      return { message: `Database Error: Failed to create tour booking. ${error.message}` };
    }

    console.log(`Tour booking ${uniqueId} created successfully.`);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not create tour booking.' };
  }

  // 5. Revalidate cache and return success
  revalidatePath('/tour-packages');
  // Pass back the new bookingId
  return { message: `Successfully created tour booking ${uniqueId}!`, bookingId: uniqueId }; 
}

// --- UPDATE ---
export async function updateTourPackageBooking(
  id: string,
  formData: FormData
): Promise<FormState> {
  // Log the ID received by the function immediately
  console.log(`[updateTourPackageBooking] Received ID: ${id}, Type: ${typeof id}`); 
  if (!id || typeof id !== 'string') { // Add stricter check for ID
     console.error('[updateTourPackageBooking] Invalid or missing ID received:', id);
     return { message: 'Error: Invalid or missing booking ID for update.' };
  }

  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());

  // Extract and parse addons JSON
  const addonsString = rawFormData.addons as string || '[]';
  let parsedAddons: Array<{ id: string; name: string; amount: number }> = [];
  try {
    parsedAddons = JSON.parse(addonsString);
    if (!Array.isArray(parsedAddons)) throw new Error("Addons is not an array");
  } catch (e) {
      console.error("Failed to parse addons JSON:", e);
      return {
          message: 'Invalid format for additional costs data.',
          errors: { addons: ['Invalid add-ons data submitted.'] }
      };
  }

  const { 
      linked_booking_id: rawLinkedId, 
      addons: rawAddons, // Exclude raw addons string
      base_price_per_pax: rawBasePrice,
      pax: rawPax,
      ...otherRawData 
  } = rawFormData;

  const processedLinkedId = rawLinkedId === '' ? null : rawLinkedId as string | null;
  
  const formDataForValidation = {
      ...otherRawData,
      linked_booking_id: processedLinkedId,
      addons: parsedAddons,
      base_price_per_pax: rawBasePrice === null || rawBasePrice === undefined || rawBasePrice === '' ? null : Number(rawBasePrice),
      pax: rawPax === null || rawPax === undefined || rawPax === '' ? null : Number(rawPax),
      booking_date: otherRawData.booking_date ? new Date(otherRawData.booking_date as string) : null,
      travel_start_date: otherRawData.travel_start_date ? new Date(otherRawData.travel_start_date as string) : null,
      travel_end_date: otherRawData.travel_end_date ? new Date(otherRawData.travel_end_date as string) : null,
  };
  
  const validatedFields = TourPackageBookingSchema.safeParse(formDataForValidation);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    const fieldValuesWithString = Object.fromEntries(
        Object.entries(rawFormData).map(([key, value]) => [key, String(value ?? '')])
    );
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      fieldValues: fieldValuesWithString,
    };
  }

  // Destructure validated data
  const { 
      // Restore all fields
      customer_name, 
      tour_product_id, 
      base_price_per_pax, 
      addons, 
      pax, 
      status, 
      booking_date, 
      travel_start_date, 
      travel_end_date, 
      notes,
      linked_booking_id
  } = validatedFields.data;

  // --- Server-side Calculation (Restore) --- 
  const addonsTotal = addons.reduce((sum, item) => sum + item.amount, 0);
  const baseSubtotal = (base_price_per_pax ?? 0) * pax;
  const grandTotal = baseSubtotal + addonsTotal;
  
  // For backward compatibility, still compute total_per_pax but don't use it in grand total
  const totalPerPax = (base_price_per_pax ?? 0);
  // --- End Calculation ---

  // 2. Prepare data for Supabase update (Restore all fields)
  const dataToUpdate = {
      customer_name,
      tour_product_id,
      base_price_per_pax: base_price_per_pax ?? 0,
      pax,
      status,
      addons,
      total_per_pax: totalPerPax,
      grand_total: grandTotal,
      booking_date: booking_date?.toISOString(),
      travel_start_date: travel_start_date?.toISOString(),
      travel_end_date: travel_end_date?.toISOString(),
      notes,
      linked_booking_id, // Keep this
      updated_at: new Date().toISOString(),
  };

  // 3. Update data in Supabase
  try {
    // Restore original log message
    console.log(`Attempting to update tour booking ${id}:`, dataToUpdate);
    // Remove .select() and result logging
    const { error } = await supabase 
      .from('tour_package_bookings')
      .update(dataToUpdate)
      .eq('id', id);
      // .select(); // Remove select()

    if (error) {
      console.error('Supabase Update Error:', error);
      return { message: `Database Error: Failed to update tour booking. ${error.message}` };
    }
    // Remove Supabase result log
    // console.log(`Supabase update result for ${id}:`, updateResult);
    // Restore original success log
    console.log(`Tour booking ${id} updated successfully.`); 
  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not update tour booking.' };
  }

  // 4. Revalidate cache and return success
  revalidatePath('/tour-packages');
  revalidatePath(`/tour-packages/${id}/edit`);
  revalidatePath(`/tour-packages/${id}`); 
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

// Ensure the select includes the new fields and removes the old 'price'
export async function getTourPackageBookings(): Promise<TourPackageBookingWithProduct[]> {
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tour_package_bookings')
    .select(`
      id, customer_name, tour_product_id, 
      base_price_per_pax, 
      addons, 
      total_per_pax, 
      grand_total, 
      pax, status, booking_date, travel_start_date, travel_end_date, notes, created_at, updated_at, 
      linked_booking_id,
      tour_products ( name )
    `)
    .order('created_at', { ascending: false })
    .order('booking_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Database Error fetching tour package bookings:', error);
    return [];
  }
  
  // Use safer type assertion
  return (data as unknown as TourPackageBookingWithProduct[]) || [];
}

// Ensure the select includes the new fields and removes the old 'price'
export async function getTourPackageBookingById(id: string): Promise<TourPackageBookingWithProduct | null> {
  if (!id) return null;
  const supabase = createSimpleServerClient();
  
  // Step 1: Fetch the main tour package booking data
  const { data: bookingData, error: bookingError } = await supabase
    .from('tour_package_bookings')
    .select(`
      id, customer_name, tour_product_id, 
      base_price_per_pax, 
      addons, 
      total_per_pax, 
      grand_total, 
      pax, status, booking_date, travel_start_date, travel_end_date, notes, created_at, updated_at, 
      linked_booking_id,
      tour_products ( name )
    `)
    .eq('id', id)
    .single();

  if (bookingError) {
    console.error(`Database Error fetching booking ${id}:`, bookingError);
    if (bookingError.code === 'PGRST116') { 
      return null; // Not found
    }
    return null;
  }

  if (!bookingData) {
    return null; 
  }

  // Step 2: If linked_booking_id exists, fetch the corresponding booking reference
  let linkedPnr: string | null = null;
  const bookingDataAsAny = bookingData as any; 
  if (bookingDataAsAny?.linked_booking_id) { 
    console.log(`[getTourPackageBookingById] Found linked_booking_id: ${bookingDataAsAny.linked_booking_id}. Fetching PNR...`); // Log: Attempting fetch
    const { data: linkedBookingData, error: linkedBookingError } = await supabase
      .from('bookings')
      .select('booking_reference')
      .eq('id', bookingDataAsAny.linked_booking_id) 
      .maybeSingle(); 
      
    if (linkedBookingError) {
      console.error(`[getTourPackageBookingById] Error fetching linked booking reference for tour ${id}:`, linkedBookingError);
    } else if (linkedBookingData) {
      linkedPnr = linkedBookingData.booking_reference;
      console.log(`[getTourPackageBookingById] Successfully fetched linked PNR: ${linkedPnr}`); // Log: Success
    } else {
      console.log(`[getTourPackageBookingById] Linked booking ID ${bookingDataAsAny.linked_booking_id} found, but no matching booking record in 'bookings' table.`); // Log: Linked booking not found
    }
  } else {
      console.log(`[getTourPackageBookingById] No linked_booking_id found for tour ${id}.`); // Log: No link
  }

  // Step 3: Combine the data and add the linked PNR
  const result: TourPackageBookingWithProduct = {
    ...(bookingData as unknown as TourPackageBookingWithProduct), 
    linked_booking_pnr: linkedPnr,
  };
  
  console.log(`[getTourPackageBookingById] Returning final object for tour ${id}:`, result); // Log: Final result

  return result;
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
            is_verified,
            verified_amount,
            verified_payment_date,
            verified_origin_bank,
            verified_dest_bank,
            verification_error,
            verified_at,
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
        is_verified: item.is_verified,
        verified_amount: item.verified_amount,
        verified_payment_date: item.verified_payment_date,
        verified_origin_bank: item.verified_origin_bank,
        verified_dest_bank: item.verified_dest_bank,
        verification_error: item.verification_error,
        verified_at: item.verified_at,
    }));

    return ledgerData;
}

// --- Helper to get Mime Type from Extension ---
const getMimeType = (filePath: string): string | null => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif'; // Assuming non-animated
        default: return null; // Or a default like 'application/octet-stream'
    }
};

// --- VERIFY PAYMENT SLIP (using Mistral Chat with Base64) ---

// Helper function to parse the expected JSON structure from Mistral
const OcrResultSchema = z.object({
    payment_amount: z.number().positive().optional().nullable(),
    // Use RegExp object directly for validation
    payment_date: z.string().regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}$'), "Expected YYYY-MM-DD format").optional().nullable(), 
    origin_bank: z.string().optional().nullable(),
    destination_bank: z.string().optional().nullable()
}).passthrough();

type OcrResult = z.infer<typeof OcrResultSchema>;

export async function verifyPaymentSlip(
    paymentId: string
): Promise<{ success: boolean; message: string; verificationData?: OcrResult }> {
    if (!paymentId) {
        return { success: false, message: "Error: Missing payment ID for verification." };
    }

    console.log(`[verifyPaymentSlip] Starting verification for payment ID: ${paymentId}`);

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let paymentRecord: PaymentRecord | null = null;
    let slipPath: string | null = null;

    try {
        // 1. Fetch Payment Record
        const { data, error } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();
        
        if (error || !data) {
            console.error('[verifyPaymentSlip] Fetch Payment Error:', error);
            throw new Error(`Could not find payment record ${paymentId}.`);
        }
        paymentRecord = data as PaymentRecord;
        slipPath = paymentRecord.payment_slip_path;
        console.log(`[verifyPaymentSlip] Found payment record, slip path: ${slipPath}`);

        if (!slipPath) {
             throw new Error("Payment record is missing the slip path.");
        }

        // 2. Download Image from Storage and Encode to Base64
        console.log(`[verifyPaymentSlip] Downloading slip from storage: ${slipPath}`);
        const { data: blobData, error: downloadError } = await supabaseAdmin.storage
            .from('payment-slips')
            .download(slipPath);

        if (downloadError || !blobData) {
            console.error('[verifyPaymentSlip] Download Slip Error:', downloadError);
            throw new Error(`Failed to download payment slip from storage. ${downloadError?.message ?? ''}`);
        }

        const mimeType = getMimeType(slipPath);
        if (!mimeType) {
            throw new Error(`Could not determine mime type for file: ${slipPath}`);
        }
        console.log(`[verifyPaymentSlip] Determined mime type: ${mimeType}`);

        const buffer = Buffer.from(await blobData.arrayBuffer());
        const base64Image = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Image}`;
        console.log(`[verifyPaymentSlip] Generated Base64 Data URI (length: ${dataUri.length})`);

        // 3. Call Mistral Chat API (using Base64)
        const mistralApiKey = process.env.MISTRAL_API_KEY;
        if (!mistralApiKey) {
            throw new Error("Mistral API Key not configured in environment variables.");
        }
        const mistralClient = new Mistral({ apiKey: mistralApiKey });

        const promptText = 'Analyze the provided payment slip image. Extract the following information and return it ONLY as a valid JSON object with keys \"payment_amount\" (numeric), \"payment_date\" (string, YYYY-MM-DD format), \"origin_bank\" (string), and \"destination_bank\" (string). If a value cannot be found, set the corresponding JSON key to null. Do not include any explanations or surrounding text, only the JSON object.';

        console.log("[verifyPaymentSlip] Preparing to call Mistral Chat API...");
        let chatResponse;
        try {
            chatResponse = await mistralClient.chat.complete({
                model: "mistral-small-latest", // Vision capable model
                responseFormat: { type: "json_object" }, 
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptText },
                            {
                                type: "image_url",
                                imageUrl: dataUri 
                            }
                        ]
                    }
                ],
            });
            console.log("[verifyPaymentSlip] Mistral API call successful.");
        } catch (apiError: any) {
            console.error("[verifyPaymentSlip] Mistral API call failed:", apiError);
            throw new Error(`Mistral API Error: ${apiError.message}`); // Re-throw to be caught by outer catch
        }

        // Add check for choices array
        if (!chatResponse || !chatResponse.choices || chatResponse.choices.length === 0) {
            console.error("[verifyPaymentSlip] Mistral response missing choices array:", chatResponse);
            throw new Error("Mistral returned no choices or an unexpected response structure.");
        }

        const rawContent = chatResponse.choices[0].message.content;
        console.log("[verifyPaymentSlip] Raw Mistral response content:", JSON.stringify(rawContent, null, 2)); 
        if (rawContent === null || rawContent === undefined) { // Check for null/undefined specifically
             throw new Error("Mistral returned null or undefined content.");
        }

        // 4. Parse Mistral Response
        console.log("[verifyPaymentSlip] Preparing to parse response...");
        let parsedResult: OcrResult;
        try {
             // ... existing parsing and validation logic ...
            if (typeof rawContent !== 'string') {
                console.warn("[verifyPaymentSlip] Mistral content was not a string, attempting parse anyway. Type:", typeof rawContent);
            }
            const jsonContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent; 
            
            const validation = OcrResultSchema.safeParse(jsonContent);
            if (!validation.success) {
                console.error("[verifyPaymentSlip] Zod Validation Error:", validation.error.flatten());
                throw new Error(`Mistral response JSON structure is invalid: ${validation.error.message}`);
            }
            parsedResult = validation.data;
            console.log("[verifyPaymentSlip] Parsed OCR Result:", parsedResult); 
        } catch (parseError: any) {
            console.error("[verifyPaymentSlip] Failed to parse or validate Mistral JSON response:", parseError);
            // Add the raw content to the error message for context
            throw new Error(`Failed to process OCR response: ${parseError.message}. Raw content was: ${JSON.stringify(rawContent)}`);
        }

        // 5. Update Payment Record in DB
        console.log("[verifyPaymentSlip] Preparing to update database...");
        const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
                is_verified: true,
                verified_amount: parsedResult.payment_amount,
                verified_payment_date: parsedResult.payment_date ? new Date(parsedResult.payment_date + 'T00:00:00') : null, 
                verified_origin_bank: parsedResult.origin_bank,
                verified_dest_bank: parsedResult.destination_bank,
                verification_error: null,
                verified_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (updateError) {
            console.error('[verifyPaymentSlip] Update Payment Error:', updateError);
            throw new Error(`Failed to update payment record after verification. ${updateError.message}`);
        }

        console.log(`[verifyPaymentSlip] Successfully verified and updated payment ID: ${paymentId}`);
        revalidatePath('/payments'); 
        revalidatePath(`/tour-packages/${paymentRecord.tour_package_booking_id}`); 
        return { success: true, message: "Payment verified successfully.", verificationData: parsedResult };

    } catch (error: any) {
        // Log the error caught by the main try...catch block
        console.error(`[verifyPaymentSlip] Overall verification failed for ${paymentId}. Error:`, error); 
        // Attempt to store the error message in the database
        if (paymentId) { 
            await supabaseAdmin
                .from('payments')
                .update({ 
                    is_verified: false, 
                    verification_error: error.message 
                })
                .eq('id', paymentId)
                .maybeSingle(); 
        }
        return { success: false, message: error.message || "An unexpected error occurred during verification." };
    }
} 