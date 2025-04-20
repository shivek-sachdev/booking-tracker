import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createSimpleServerClient } from "@/lib/supabase/server";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"; // For status display
import { BookingDeleteDialog } from "@/components/bookings/booking-delete-dialog";
import { AlertCircle } from "lucide-react";

// Helper to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  } catch {
    return "Invalid Date";
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

// Define the type for a booking sector
interface BookingSector {
  travel_date: string | null;
}

// Type for the data structure returned by the Supabase query
interface FetchedBooking {
  id: string;
  booking_reference: string | null;
  booking_type: string | null;
  status: string | null;
  deadline: string | null;
  created_at: string | null;
  customers: { company_name: string } | null;
  booking_sectors: BookingSector[];
}

export default async function BookingsPage() {
  const supabase = createSimpleServerClient();
  
  // Get current date for deadline comparison
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayFormatted = today.toISOString().split('T')[0];
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];

  // Fetch bookings with customer join and sectors
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id, 
      booking_reference, 
      booking_type, 
      status, 
      deadline, 
      created_at, 
      customers(company_name),
      booking_sectors(travel_date)
    `)
    .order('created_at', { ascending: false })
    .returns<FetchedBooking[]>(); // Specify the return type here

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        {/* Link to a future Add Booking page */}
        <Button asChild>
             <Link href="/bookings/new">Add New Booking</Link>
        </Button>
      </div>

      {error && (
        <p className="text-red-500 mb-4">Error loading bookings: {error.message}</p>
      )}

      <Table>
        <TableCaption>A list of your tracked bookings.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Travel Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <TableRow 
                key={booking.id} 
                className={isPastDeadline(booking.deadline) ? 'bg-red-50' : ''}
              >
                <TableCell className="font-medium">
                  {booking.booking_reference}
                </TableCell>
                <TableCell>{booking.customers?.company_name ?? 'Unknown'}</TableCell>
                <TableCell>{booking.booking_type}</TableCell>
                <TableCell>{formatTravelDates(booking)}</TableCell>
                <TableCell>
                    <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                    </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {isUrgentDeadline(booking.deadline) && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={isPastDeadline(booking.deadline) ? 'text-red-600 font-medium' : ''}>
                      {formatDate(booking.deadline)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(booking.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    {/* Link to Booking Detail Page */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/bookings/${booking.id}`}>View</Link>
                    </Button>
                    
                    {/* Delete Booking with Confirmation Dialog */}
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
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                No bookings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 