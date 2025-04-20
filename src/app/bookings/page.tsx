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
import { cn } from "@/lib/utils";

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
      booking_sectors(travel_date, predefined_sectors(origin_code, destination_code))
    `)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'booking_sectors', ascending: true })
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
            <TableHead>Sector</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Travel Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
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