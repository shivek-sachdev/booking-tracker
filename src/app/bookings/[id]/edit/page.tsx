import { createSimpleServerClient } from "@/lib/supabase/server";
import { notFound } from 'next/navigation';
import { BookingForm } from "@/components/bookings/booking-form";
import type { Booking, BookingSector, PredefinedSector, Customer } from "@/types/database";

// Type to represent a BookingSector with its related PredefinedSector data included
interface PopulatedBookingSector extends BookingSector {
  predefined_sectors: Pick<PredefinedSector, 'id' | 'origin_code' | 'destination_code' | 'description'> | null;
}

// Type to represent the full Booking data with related Customer and PopulatedSectors
interface FullBookingEditData extends Booking {
    customers: Pick<Customer, 'id' | 'company_name'> | null;
    booking_sectors: PopulatedBookingSector[];
}

// Update params type to be more direct for Next.js App Router
interface EditBookingPageProps {
    params: { id: string } | Promise<{ id: string }>;
}

// Type guard to check if params is a Promise
function isPromise(p: unknown): p is Promise<{ id: string }> {
   // More robust check for promise-like structure with unknown
   return (
       typeof p === 'object' &&
       p !== null &&
       'then' in p &&
       typeof (p as { then: unknown }).then === 'function'
   );
}

export default async function EditBookingPage({ params }: EditBookingPageProps) {
    // Await params if it's a promise, otherwise use it directly
    const resolvedParams = isPromise(params) ? await params : params;
    const { id } = resolvedParams;
    
    const supabase = createSimpleServerClient();

    // Fetch full booking data, customer list, and predefined sectors list
    const [bookingResult, customersResult, predefinedSectorsResult] = await Promise.all([
        supabase
            .from('bookings')
            .select(`
                id, customer_id, booking_reference, booking_type, deadline, status, num_pax, created_at, updated_at,
                customers ( id, company_name ),
                booking_sectors ( *, predefined_sectors ( id, origin_code, destination_code, description ) )
            `) 
            .eq('id', id)
            .order('created_at', { referencedTable: 'booking_sectors', ascending: true })
            .returns<FullBookingEditData>()
            .single(),
        supabase
            .from('customers')
            .select('id, company_name')
            .order('company_name', { ascending: true })
            .returns<Customer[]>(),
        supabase
            .from('predefined_sectors')
            .select('id, origin_code, destination_code, description')
            .order('origin_code', { ascending: true })
            .order('destination_code', { ascending: true })
            .returns<PredefinedSector[]>()
    ]);

    const booking = bookingResult.data as FullBookingEditData | null;
    const customers = customersResult.data ?? [];
    const predefinedSectors = predefinedSectorsResult.data ?? [];
    const error = bookingResult.error || customersResult.error || predefinedSectorsResult.error;

    // Type guard to ensure booking is not null and has the expected structure
    if (error || !booking || !booking.booking_sectors) {
        const errorMessage = error instanceof Error ? error.message : "Booking data not found or error fetching related data";
        console.error("Error fetching full data for edit page:", errorMessage);
        notFound(); 
    }
    
    // Prepare initialData for the form, converting dates and structuring sectors
    const initialData = {
      customer_id: booking.customer_id,
      booking_reference: booking.booking_reference,
      booking_type: booking.booking_type,
      deadline: booking.deadline ? new Date(booking.deadline) : null, 
      sectors: booking.booking_sectors.map(sector => ({
          predefined_sector_id: sector.predefined_sector_id,
          travel_date: sector.travel_date ? new Date(sector.travel_date) : null, 
          flight_number: sector.flight_number || '',
          status: sector.status,
          num_pax: sector.num_pax,
      })) || [],
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-6">Edit Booking: {booking.booking_reference || `ID ${booking.id.substring(0, 8)}...`}</h1>
            
            {/* Display error message if fetch failed, ensuring type safety */}
            {error && (
                 <p className="text-red-500 mb-4">Error loading data: {error instanceof Error ? error.message : 'An unknown error occurred'}</p>
             )}

            {!error && booking && (
                <BookingForm 
                    mode="edit"
                    customers={customers}
                    predefinedSectors={predefinedSectors}
                    initialData={initialData}
                    bookingId={booking.id}
                />
            )}
        </div>
    );
} 