'use client'; // Convert to Client Component for state management

import React, { useState, useEffect, useMemo } from 'react'; // Import hooks
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/client'; // <-- SWITCH TO CLIENT component creator
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"; // For status display
import { BookingDeleteDialog } from "@/components/bookings/booking-delete-dialog";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from '@/types/database'; // Import BookingStatus
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Label } from "@/components/ui/label"; // Import Label
import { 
  ResponsiveTable, 
  ResponsiveCard, 
  ResponsiveCardItem,
  ResponsiveCardContainer 
} from "@/components/ui/responsive-table"; // Import our responsive components

// Helper function to format short date (e.g., 13APR) with Thailand timezone
function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { 
      month: 'short',
      timeZone: 'Asia/Bangkok'
    }).toUpperCase();
    return `${day}${month}`;
  } catch {
    return "N/A";
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
   // Ensure a return statement is present in all paths
   return "(Error processing date)"; 
  }
}

// Helper function to format sector display string
function formatSectorsDisplay(booking: FetchedBooking): string {
  if (!booking.booking_sectors || booking.booking_sectors.length === 0) {
    return "N/A";
  }

  // Sectors are assumed to be sorted by the query
  const sectors = booking.booking_sectors;

  const firstSector = sectors[0]?.predefined_sectors;
  const origin1 = firstSector?.origin_code ?? '?';
  const dest1 = firstSector?.destination_code ?? '?';

  if (booking.booking_type === 'One-Way') {
    return `${origin1}-${dest1}`;
  }

  if (booking.booking_type === 'Return' && sectors.length >= 2) {
    const secondSector = sectors[1]?.predefined_sectors;
    // Assuming the return destination is the same as the first origin
    const dest2 = secondSector?.destination_code ?? '?'; 
    // We only need the destination of the second leg for BKK-PBH-BKK format
    return `${origin1}-${dest1}-${dest2}`; 
  }

  // Fallback for unexpected types or sector counts
  return sectors.map(s => `${s.predefined_sectors?.origin_code ?? '?'}-${s.predefined_sectors?.destination_code ?? '?'}`).join(', ');
}

// Define the type for a booking sector
interface BookingSector {
  travel_date: string | null;
  predefined_sectors: {
    origin_code: string | null;
    destination_code: string | null;
  } | null;
}

// Type for the data structure returned by the Supabase query
interface FetchedBooking {
  id: string;
  booking_reference: string | null;
  booking_type: string | null;
  status: BookingStatus | string | null;
  deadline: string | null;
  created_at: string | null;
  customers: { company_name: string } | null;
  booking_sectors: BookingSector[];
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<FetchedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTicketed, setShowTicketed] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // Create the Supabase client instance once using useState
  const [supabase] = useState(() => createClient()); // <-- Use useState and CORRECT client creator
  
  // Get current date for deadline comparison
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayFormatted = today.toISOString().split('T')[0];
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];

  // Fetch data on component mount
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        // Use the stable supabase client instance from state
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, 
            booking_reference, 
            booking_type, 
            status, 
            deadline, 
            created_at, 
            customers(company_name),
            booking_sectors(travel_date, predefined_sectors(origin_code, destination_code))
          `)
          .order('created_at', { ascending: false }) // Order main bookings
          .order('created_at', { referencedTable: 'booking_sectors', ascending: true }) // Order sectors within booking
          .returns<FetchedBooking[]>(); // Specify the return type here

        if (error) throw error;
        setBookings(data || []);
      } catch (error: unknown) {
        console.error("Error fetching bookings:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load bookings.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- REMOVE supabase from dependency array

  // Helper to format travel dates
  const formatTravelDates = (booking: FetchedBooking): string => {
    if (!booking.booking_sectors || booking.booking_sectors.length === 0) {
      return "N/A";
    }

    // Sort sectors by travel date
    const sortedSectors = [...booking.booking_sectors]
      .filter((sector: BookingSector) => sector.travel_date)
      .sort((a: BookingSector, b: BookingSector) => {
        if (!a.travel_date) return 1;
        if (!b.travel_date) return -1;
        return new Date(a.travel_date).getTime() - new Date(b.travel_date).getTime();
      });

    if (sortedSectors.length === 0) {
      return "N/A";
    }
    
    // For one-way bookings (or only one date)
    if (booking.booking_type === 'One-Way' || sortedSectors.length === 1) {
      return formatShortDate(sortedSectors[0].travel_date);
    }
    
    // For return bookings
    if (booking.booking_type === 'Return' && sortedSectors.length >= 2) {
      const departDate = formatShortDate(sortedSectors[0].travel_date);
      const returnDate = formatShortDate(sortedSectors[1].travel_date);
      
      if (departDate !== "N/A" && returnDate !== "N/A") {
        return `${departDate}-${returnDate}`;
      }
    }
    
    // Fallback for other cases
    return sortedSectors.map((s: BookingSector) => formatShortDate(s.travel_date)).join(", ");
  };
  
  // Helper functions to check deadlines
  const isToday = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    return dateString.includes(todayFormatted);
  };

  const isTomorrow = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    return dateString.includes(tomorrowFormatted);
  };

  const isPastDeadline = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const deadlineDate = new Date(dateString);
    deadlineDate.setHours(23, 59, 59); // End of the deadline day
    return deadlineDate < today;
  };
  
  const isUrgentDeadline = (deadline: string | null | undefined): boolean => {
    return isToday(deadline) || isTomorrow(deadline) || isPastDeadline(deadline);
  };

  // Filter bookings based on state
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const status = booking.status as BookingStatus; // Cast status to BookingStatus
      // Default statuses to show
      if (status === 'Confirmed' || status === 'Waiting List') {
        return true;
      }
      // Conditionally show Ticketed
      if (showTicketed && status === 'Ticketed') {
        return true;
      }
      // Conditionally show Cancelled
      if (showCancelled && status === 'Cancelled') {
        return true;
      }
      return false;
    });
  }, [bookings, showTicketed, showCancelled]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Button asChild className="w-full sm:w-auto">
             <Link href="/bookings/new">Add New Booking</Link>
        </Button>
      </div>

      {fetchError && (
        <p className="text-red-500 mb-4">Error loading bookings: {fetchError}</p>
      )}

      {/* Add filter checkboxes */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showTicketed"
            checked={showTicketed}
            onCheckedChange={(checked) => setShowTicketed(Boolean(checked))}
          />
          <Label htmlFor="showTicketed">Show Ticketed</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showCancelled"
            checked={showCancelled}
            onCheckedChange={(checked) => setShowCancelled(Boolean(checked))}
          />
          <Label htmlFor="showCancelled">Show Cancelled</Label>
        </div>
      </div>

      {/* Desktop view (table) */}
      <div className="hidden md:block">
        <ResponsiveTable caption="A list of your tracked bookings.">
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Travel Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading bookings...
                </TableCell>
              </TableRow>
            ) : filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No bookings found matching the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow 
                  key={booking.id} 
                  className={isPastDeadline(booking.deadline) ? 'bg-red-50' : ''}
                >
                  <TableCell className="font-medium">
                    {booking.booking_reference}
                  </TableCell>
                  <TableCell>{booking.customers?.company_name ?? 'Unknown'}</TableCell>
                  <TableCell>{formatSectorsDisplay(booking)}</TableCell>
                  <TableCell>{booking.booking_type}</TableCell>
                  <TableCell>{formatTravelDates(booking)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isUrgentDeadline(booking.deadline) && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={isPastDeadline(booking.deadline) ? 'text-red-600 font-medium' : ''}>
                        {formatShortDate(booking.deadline)} 
                        <span className="text-muted-foreground text-xs ml-1">
                          {formatDeadlineDifference(booking.deadline)}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/bookings/${booking.id}`}>View</Link>
                      </Button>
                      
                      <BookingDeleteDialog 
                        booking={{ 
                          id: booking.id, 
                          booking_reference: booking.booking_reference || 'No Reference'
                        }}
                        triggerButton={
                          <Button variant="destructive" size="sm">Delete</Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </ResponsiveTable>
      </div>

      {/* Mobile view (cards) */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="text-center py-4">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-4">No bookings found matching the current filters.</div>
        ) : (
          <ResponsiveCardContainer>
            {filteredBookings.map((booking) => (
              <ResponsiveCard
                key={booking.id}
                className={isPastDeadline(booking.deadline) ? 'bg-red-50' : ''}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{booking.booking_reference || 'No Reference'}</div>
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
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <ResponsiveCardItem 
                    label="Customer" 
                    value={booking.customers?.company_name ?? 'Unknown'} 
                  />
                  <ResponsiveCardItem 
                    label="Sector" 
                    value={formatSectorsDisplay(booking)} 
                  />
                  <ResponsiveCardItem 
                    label="Travel Date" 
                    value={formatTravelDates(booking)} 
                  />
                  <ResponsiveCardItem 
                    label="Deadline" 
                    value={
                      <div className="flex items-center gap-1">
                        {isUrgentDeadline(booking.deadline) && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={isPastDeadline(booking.deadline) ? 'text-red-600 font-medium' : ''}>
                          {formatShortDate(booking.deadline)} 
                          <span className="text-muted-foreground text-xs ml-1">
                            {formatDeadlineDifference(booking.deadline)}
                          </span>
                        </span>
                      </div>
                    } 
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/bookings/${booking.id}`}>View</Link>
                  </Button>
                  
                  <BookingDeleteDialog 
                    booking={{ 
                      id: booking.id, 
                      booking_reference: booking.booking_reference || 'No Reference'
                    }}
                    triggerButton={
                      <Button variant="destructive" size="sm">Delete</Button>
                    }
                  />
                </div>
              </ResponsiveCard>
            ))}
          </ResponsiveCardContainer>
        )}
      </div>
    </div>
  );
} 