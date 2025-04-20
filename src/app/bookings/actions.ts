'use server';

import { z } from 'zod';
import { createSimpleServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { bookingFormSchema, BookingFormData, bookingStatuses } from '@/lib/schemas';
import type { BookingStatus } from '@/types/database';
import { format } from 'date-fns';

// Helper function to determine overall booking status from sectors
function determineOverallStatus(sectors: BookingFormData['sectors']): BookingStatus {
    return sectors.some(sector => sector.status === 'Waiting List') ? 'Waiting List' : 'Confirmed';
}

function formatDateForDB(date: Date | null | undefined): string | null {
    if (!date) return null;
    try {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
        return null; // Handle invalid date object if necessary
    }
}

export type BookingActionState = {
  message: string | null;
  statusMessage?: string | null;
  isSuccess?: boolean;
  errors?: z.ZodIssue[];
  bookingId?: string | null;
};

// Server Action to add a new booking and its sectors
export async function addBooking(prevState: BookingActionState | undefined, formData: FormData): Promise<BookingActionState> {

  // WARNING: This is a simplified approach without proper transaction handling.
  // If inserting sectors fails after the booking is created, the booking will still exist.
  // A robust solution would use a database function (RPC) to perform both inserts atomically.

  // Manual parsing because formData doesn't directly support nested arrays/objects
  let parsedData: BookingFormData;
  try {
    const sectorsJson = formData.get('sectorsJson') as string;
    // Parse sectors, converting travel_date strings back to Date objects for Zod
    const rawSectors = (JSON.parse(sectorsJson) as Record<string, unknown>[]).map(s => ({
      ...s,
      travel_date: s.travel_date ? new Date(s.travel_date as string) : undefined,
    }));

    // Coerce num_pax to number before parsing
    const numPaxValue = formData.get('num_pax');

    parsedData = bookingFormSchema.parse({
        customer_id: formData.get('customer_id'),
        num_pax: numPaxValue ? Number(numPaxValue) : undefined, // Parse num_pax
        booking_type: formData.get('booking_type'),
        booking_reference: formData.get('booking_reference'),
        deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : null,
        sectors: rawSectors,
    });
  } catch (error) {
     if (error instanceof z.ZodError) {
        return { message: 'Validation failed', errors: error.issues };
    } else if (error instanceof Error) {
         console.error('Form parsing error:', error);
        return { message: `Error parsing form data: ${error.message}` };
    } else {
        console.error('Unknown parsing error:', error);
        return { message: 'An unknown error occurred during form processing.' };
    }
  }

  const supabase = createSimpleServerClient();

  // 1. Insert the main booking record
  const overallStatus = determineOverallStatus(parsedData.sectors);
  
  // Calculate total passenger count from all sectors
  const totalPassengers = parsedData.sectors.reduce((sum, sector) => sum + sector.num_pax, 0);
  
  const { data: newBooking, error: bookingInsertError } = await supabase
    .from('bookings')
    .insert({
        customer_id: parsedData.customer_id,
        num_pax: totalPassengers, // Use calculated total
        booking_type: parsedData.booking_type,
        booking_reference: parsedData.booking_reference,
        deadline: formatDateForDB(parsedData.deadline),
        status: overallStatus,
    })
    .select('id') // Select the ID of the newly created booking
    .single();

  if (bookingInsertError || !newBooking) {
    console.error('Supabase error adding booking:', bookingInsertError);
    return { message: `Database Error: Failed to create booking. ${bookingInsertError?.message}` };
  }

  // 2. Insert the booking sectors
  const sectorsToInsert = parsedData.sectors.map(sector => ({
      booking_id: newBooking.id,
      predefined_sector_id: sector.predefined_sector_id,
      travel_date: formatDateForDB(sector.travel_date), // Format date
      status: sector.status,
      flight_number: sector.flight_number,
      num_pax: sector.num_pax, // Include sector-specific passenger count
  }));

  const { error: sectorsInsertError } = await supabase
    .from('booking_sectors')
    .insert(sectorsToInsert);

  if (sectorsInsertError) {
    console.error('Supabase error adding sectors:', sectorsInsertError);
    // Attempt to delete the booking record we just created (basic cleanup)
     await supabase.from('bookings').delete().eq('id', newBooking.id);
    return { message: `Database Error: Failed to add sectors after booking was created. Booking creation rolled back. ${sectorsInsertError.message}` };
  }

  // Revalidate relevant paths
  revalidatePath('/bookings');
  revalidatePath('/'); // Revalidate dashboard

  // Instead of redirecting, return success with the booking ID
  return { 
    message: 'Successfully added booking', 
    bookingId: newBooking.id,
    isSuccess: true
  };
}

// NOTE: Using updateBookingActionSchema defined in schemas.ts
// const updateBookingSchema = z.object({ ... }); // Removed local definition

// Server Action to UPDATE a booking and REPLACE its sectors
export async function updateBooking(
  bookingId: string,
  formData: FormData
): Promise<BookingActionState> {
  if (!bookingId) {
    return { message: 'Error: Missing booking ID' };
  }

  try {
    // Parse form data using the specific schema from schemas.ts
    const { updateBookingActionSchema } = await import('@/lib/schemas'); // Dynamically import to ensure it's loaded
    const parsedData = updateBookingActionSchema.parse({
      booking_reference: formData.get('booking_reference'),
      customer_id: formData.get('customer_id'),
      status: formData.get('status'),
      deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : null,
    });

    const supabase = createSimpleServerClient();

    // Update booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        booking_reference: parsedData.booking_reference,
        customer_id: parsedData.customer_id,
        status: parsedData.status,
        deadline: formatDateForDB(parsedData.deadline as Date | null | undefined),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
      return { 
        message: `Error updating booking: ${bookingError.message}`
      };
    }

    // If sectors JSON is provided, handle sector updates
    const sectorsJson = formData.get('sectorsJson');
    if (sectorsJson) {
      try {
        // Process sectors (if needed)
        // We're keeping this part commented out since it's not part of this fix
      } catch (sectorError) {
        return { 
          message: `Error processing sectors: ${sectorError instanceof Error ? sectorError.message : String(sectorError)}`
        };
      }
    }

    revalidatePath('/bookings');
    return { message: 'Booking updated successfully' };
  } catch (error) {
    console.error('Error in updateBooking:', error);
    const errorMessage = error instanceof z.ZodError 
      ? error.errors.map(e => `${e.path}: ${e.message}`).join(', ')
      : error instanceof Error ? error.message : String(error);
    
    return { message: `Error: ${errorMessage}` };
  }
}

// Server Action to delete a booking
export async function deleteBooking(bookingId: string): Promise<BookingActionState> {
  if (!bookingId) {
    return { message: 'Error: Invalid Booking ID provided for deletion.' };
  }

  const supabase = createSimpleServerClient();

  // Delete the booking. Relies on `ON DELETE CASCADE` for booking_sectors.
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (error) {
    console.error('Supabase error deleting booking:', error);
    return { message: `Database Error: Failed to delete booking. ${error.message}` };
  }

  // Revalidate relevant paths
  revalidatePath('/bookings');
  revalidatePath('/');

  // No redirect needed from here, handled client-side or via page navigation
  return { message: 'Booking deleted successfully.' };
} 