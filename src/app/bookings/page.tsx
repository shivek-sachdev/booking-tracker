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
import type { Booking } from "@/types/database";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"; // For status display
import { BookingDeleteDialog } from "@/components/bookings/booking-delete-dialog";

// Helper to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  } catch {
    return "Invalid Date";
  }
}

export default async function BookingsPage() {
  const supabase = createSimpleServerClient();

  // Fetch bookings with customer join
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, booking_type, status, deadline, created_at, customers(company_name)')
    .order('created_at', { ascending: false })
    .returns<Booking[]>();

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
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {booking.booking_reference}
                </TableCell>
                <TableCell>{booking.customers?.company_name ?? 'Unknown'}</TableCell>
                <TableCell>{booking.booking_type}</TableCell>
                <TableCell>
                    <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                    </Badge>
                </TableCell>
                <TableCell>{formatDate(booking.deadline)}</TableCell>
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
                        booking_reference: booking.booking_reference 
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
              <TableCell colSpan={7} className="text-center">
                No bookings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 