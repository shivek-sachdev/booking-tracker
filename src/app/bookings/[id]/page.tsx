'use client'; // Make this a Client Component

import { createSimpleServerClient } from "@/lib/supabase/server";
import type { Booking, BookingSector, PredefinedSector, Customer } from "@/types/database";
import { notFound } from 'next/navigation';
import { useState, useEffect, use } from 'react';
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
import { BookingDeleteDialog } from "@/components/bookings/booking-delete-dialog";
import { cn } from "@/lib/utils"; // For class merging

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

// Helper function to calculate and format deadline difference
function formatDeadlineDifference(deadline: string | null | undefined): string {
  if (!deadline) return "No deadline";

  try {
    const deadlineDate = new Date(deadline);
    // Set deadline to the end of its day for comparison against the start of today
    deadlineDate.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2); // Start of the day after tomorrow

    // Check if deadline has passed (is before the start of today)
    if (deadlineDate.getTime() < today.getTime()) {
      // Calculate how many days ago it was (using floor for whole days passed)
      const pastDiffTime = today.getTime() - deadlineDate.getTime();
      // Add 1 because we compare end of deadline day to start of today
      const daysOverdue = Math.floor(pastDiffTime / (1000 * 60 * 60 * 24)) + 1;
      return `(Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''})`;
    }
    // Check if deadline is today (falls between start of today and start of tomorrow)
    else if (deadlineDate.getTime() < tomorrow.getTime()) {
      return "(Due today)";
    }
    // Check if deadline is tomorrow (falls between start of tomorrow and start of day after)
    else if (deadlineDate.getTime() < dayAfterTomorrow.getTime()) {
      return "(Due tomorrow)";
    }
    // Otherwise, it's in the future
    else {
      const futureDiffTime = deadlineDate.getTime() - today.getTime();
      // Use ceil to count the current day as one day away if not today/tomorrow
      const diffDays = Math.ceil(futureDiffTime / (1000 * 60 * 60 * 24));
      return `(Due in ${diffDays} days)`;
    }
  } catch {
    return "(Invalid date)";
  }
}

// Helper function to format short date (e.g., 13APR)
function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${day}${month}`;
  } catch {
    return "N/A";
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

         // --- Check for errors first --- 
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

         // --- If no errors, extract data --- 
         const bookingData = bookingResult.data;
         const sectorsData = sectorsResult.data;

         // --- Check if booking data is actually present --- 
         if (!bookingData) {
             throw new Error("Booking data is null after successful fetch.");
         }

         // --- Finally, set state --- 
         setBooking(bookingData);
         setSectors(sectorsData || []); // sectorsData can be null or [], default to []
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
                <BookingDeleteDialog 
                  booking={{ 
                    id: booking.id, 
                    booking_reference: booking.booking_reference 
                  }}
                  triggerButton={
                    <Button variant="destructive">Delete Booking</Button>
                  }
                />
             </div>
        </div>

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
                <p><strong>Status:</strong> 
                    <Badge 
                        className={cn({
                            'bg-green-100 text-green-800': booking.status === 'Ticketed',
                            'bg-red-100 text-red-800': booking.status === 'Cancelled',
                            'bg-blue-100 text-blue-800': booking.status === 'Confirmed',
                            'bg-amber-100 text-amber-800': booking.status === 'Waiting List',
                            'bg-gray-100 text-gray-800': !booking.status || ['Pending', 'Unconfirmed'].includes(booking.status)
                        })}
                    >
                        {booking.status}
                    </Badge>
                </p>
                <p>
                    <strong>Deadline:</strong> {formatDate(booking.deadline)} 
                    <span className="text-muted-foreground ml-1">
                        {formatDeadlineDifference(booking.deadline)}
                    </span>
                </p>
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
                            <TableHead>Travel Date</TableHead>
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
                                <TableCell>{formatShortDate(sector.travel_date)}</TableCell>
                                <TableCell>{sector.flight_number || '-'}</TableCell>
                                <TableCell>
                                    <Badge 
                                        className={cn({
                                            'bg-blue-100 text-blue-800': sector.status === 'Confirmed',
                                            'bg-amber-100 text-amber-800': sector.status === 'Waiting List',
                                        })}
                                    >
                                        {sector.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{sector.num_pax || '-'}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            No sectors found for this booking.
                        </TableCell>
                    </TableRow>
                )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
} 