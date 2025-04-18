'use client'; // Make this a Client Component

import { createSimpleServerClient } from "@/lib/supabase/server";
import type { Booking, BookingSector, PredefinedSector, Customer } from "@/types/database";
import { notFound, useRouter } from 'next/navigation';
import { useState, useTransition, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { deleteBooking } from '../actions';

// Type combining BookingSector with nested PredefinedSector details
interface PopulatedBookingSector extends BookingSector {
  predefined_sectors: Pick<PredefinedSector, 'origin_code' | 'destination_code' | 'description'> | null;
}

// Helper to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  } catch {
    return "Invalid Date";
  }
}

// Props for the page component, including URL parameters
interface BookingDetailPageProps {
    // Match exactly the type expected by Next.js 15/React 19
    params: Promise<{ id: string }> | undefined;
}

interface PopulatedBooking extends Booking {
  customers: Customer | null;
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  // Handle potential undefined params and unwrap the promise
  if (!params) {
    throw new Error("Missing page parameters");
  }
  
  // Unwrap params using the use hook (since this is NOT an async function)
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [booking, setBooking] = useState<PopulatedBooking | null>(null);
  const [sectors, setSectors] = useState<PopulatedBookingSector[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      const supabase = createSimpleServerClient();
      try {
         const [bookingPromise, sectorsPromise] = [
            supabase
              .from('bookings')
              .select(`
                id, booking_reference, booking_type, deadline, status, created_at, updated_at, num_pax, 
                customers ( id, company_name ) 
              `)
              .eq('id', id)
              .returns<PopulatedBooking>()
              .single(),
            supabase
              .from('booking_sectors')
              .select(`
                  id, status, flight_number, created_at, travel_date, num_pax,
                  predefined_sectors ( id, origin_code, destination_code, description ) 
              `)
              .eq('booking_id', id)
              .order('created_at', { ascending: true })
              .returns<PopulatedBookingSector[]>()
         ];

         const [bookingResult, sectorsResult] = await Promise.all([bookingPromise, sectorsPromise]);

         // --- Perform all checks first --- 
         if (bookingResult.error) {
            console.error("Error fetching booking:", bookingResult.error);
            if (bookingResult.error.code === 'PGRST116') {
                 throw new Error("Booking not found.");
            } else {
                throw bookingResult.error;
            }
         }
         if (sectorsResult.error) {
            console.error("Error fetching sectors:", sectorsResult.error);
            throw sectorsResult.error;
         }

         if (!bookingResult.data) {
             throw new Error("Booking not found (data is null).");
         }

         // --- If all checks passed, set state --- 
         setBooking(bookingResult.data);
         setSectors(sectorsResult.data || []);
      } catch (error: unknown) {
          let errorMessage = 'Failed to load booking details.';
          if (error instanceof Error) {
              errorMessage = error.message;
              console.error('Error in fetchData:', error.message);
              if (error.message.toLowerCase().includes('booking not found')) {
                  notFound();
              }
          } else {
              console.error('Unknown error in fetchData:', error);
          }
          setFetchError(errorMessage);
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDelete = async () => {
    setErrorMsg(null);
    if (!booking) return;

    if (!window.confirm('Are you sure you want to delete this booking?')) {
        return;
    }

    startTransition(async () => {
        const result = await deleteBooking(booking.id);
        if (result.message === 'Booking deleted successfully.') {
            router.push('/bookings');
        } else {
            setErrorMsg(result.message || 'Failed to delete booking.');
        }
    });
  };

  if (isLoading) {
      return <p className="p-4">Loading booking details...</p>;
  }

  if (fetchError) {
      return <p className="text-red-500 p-4">{fetchError}</p>;
  }

  if (!booking) {
    notFound();
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">
                Booking: {booking.booking_reference}
            </h1>
            <div className="space-x-2">
                <Link href={`/bookings/${id}/edit`}>
                   <Button variant="outline">Edit Booking</Button>
                </Link>
                <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={isPending}
                >
                    {isPending ? 'Deleting...' : 'Delete Booking'}
                </Button>
             </div>
        </div>

        {errorMsg && <p className="text-red-500 mb-4">Error: {errorMsg}</p>}

      <div className="grid gap-6 md:grid-cols-3 mb-6">
         {/* Booking Details Card */}
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
                <p><strong>Customer:</strong> {booking.customers?.company_name ?? 'Unknown'}</p>
                <p><strong>Reference:</strong> {booking.booking_reference}</p>
                <p><strong>Type:</strong> {booking.booking_type}</p>
                <p><strong>Status:</strong> <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'}>{booking.status}</Badge></p>
                <p><strong>Deadline:</strong> {formatDate(booking.deadline)}</p>
                <p><strong>Created:</strong> {formatDate(booking.created_at)}</p>
                 <p><strong>Updated:</strong> {formatDate(booking.updated_at)}</p>
            </CardContent>
        </Card>

         {/* Sectors Card */}
         <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Sectors</CardTitle>
                 <CardDescription>Flights associated with this booking.</CardDescription>
            </CardHeader>
             <CardContent>
                {fetchError && <p className="text-red-500 mb-4">Error loading sectors: {fetchError}</p>}
                {sectors && Array.isArray(sectors) && sectors.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Origin</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Flight No.</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Passengers</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sectors.map((sector) => (
                            <TableRow key={sector.id}>
                                <TableCell>{sector.predefined_sectors?.origin_code ?? 'N/A'}</TableCell>
                                <TableCell>{sector.predefined_sectors?.destination_code ?? 'N/A'}</TableCell>
                                <TableCell>{sector.flight_number || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={sector.status === 'Confirmed' ? 'default' : 'secondary'}>
                                        {sector.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{sector.num_pax || '-'}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                     !fetchError && <p className="text-sm text-muted-foreground">No sectors found for this booking.</p>
                )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
} 