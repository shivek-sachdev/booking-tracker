import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSimpleServerClient } from "@/lib/supabase/server";
import type { Booking, BookingStatus } from "@/types/database";
import Link from 'next/link';

// Helper function to format dates (optional, adjust as needed)
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  } catch {
    return "Invalid Date";
  }
}

// Define proper types for the status counts data
interface StatusCount {
  status: string;
  count: number;
}

// The page component is now async to allow data fetching
export default async function DashboardPage() {
  const supabase = createSimpleServerClient();

  // --- Fetch Data --- (Error handling omitted for brevity)

  // 1. Bookings nearing deadline (e.g., within next 7 days, not confirmed)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const { data: approachingDeadlines, error: deadlineError } = await supabase
    .from("bookings")
    .select("id, booking_reference, deadline, customers ( company_name )") // Fetch customer name too
    .lt("deadline", sevenDaysFromNow.toISOString().split('T')[0]) // Less than 7 days from now
    .gte("deadline", new Date().toISOString().split('T')[0]) // Greater than or equal to today
    .neq("status", 'Confirmed' as BookingStatus) // Not confirmed
    .order("deadline", { ascending: true })
    .limit(5);
  if (deadlineError) console.error("Deadline fetch error:", deadlineError.message);

  // 2. Total Bookings counts by status - USE RPC
  const { data: statusCounts, error: statusError } = await supabase
    .from('bookings')
    .select('status') // Select only status to iterate later, or use an RPC for counts
    .returns<StatusCount[]>();

  if (statusError) console.error("Count fetch error:", statusError ? statusError.message : 'Unknown error');

  // Initialize counts
  let bookingCounts = {
    total: 0,
    confirmed: 0,
    waitingList: 0,
  };

  // Process counts ONLY if data is an array and not an error object
  if (!statusError && Array.isArray(statusCounts)) {
    // Manual counting since .group() was removed
    let confirmed = 0;
    let waitingList = 0;
    statusCounts.forEach(item => {
      if (item.status === 'Confirmed') confirmed++;
      if (item.status === 'Waiting List') waitingList++;
    });
    bookingCounts = {
      total: statusCounts.length,
      confirmed: confirmed,
      waitingList: waitingList,
    };
  } else if (statusCounts && !Array.isArray(statusCounts)) {
    // Log if the RPC returned something unexpected in the data field
    console.error("Unexpected data format from get_booking_counts_by_status RPC:", statusCounts);
  }

  // 3. Recent Activity (latest 5 bookings)
  const { data: recentBookings, error: recentError } = await supabase
    .from("bookings")
    .select("id, booking_reference, status, created_at, customers ( company_name )")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Array<Booking & { customers: { company_name: string } | null }>>(); // Type assertion

  if (recentError) console.error("Recent fetch error:", recentError.message);

  // --- Render Dashboard --- 
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Bookings Nearing Deadline */}
        <Card>
          <CardHeader>
            <CardTitle>Approaching Deadlines</CardTitle>
            <CardDescription>Bookings needing attention soon</CardDescription>
          </CardHeader>
          <CardContent>
            {approachingDeadlines && approachingDeadlines.length > 0 ? (
              <ul className="space-y-2">
                {approachingDeadlines.map((booking: any) => (
                  <li key={booking.id} className="text-sm">
                    <Link href={`/bookings/${booking.id}`} className="hover:underline font-medium">
                      {booking.booking_reference || 'No Ref'}
                    </Link>
                    <span className="text-muted-foreground ml-2"> ({booking.customers?.company_name || 'Unknown Co.'})</span>
                    <span className="block text-xs text-muted-foreground">Deadline: {formatDate(booking.deadline)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                (No bookings nearing deadline currently)
              </p>
            )}
             {deadlineError && <p className="text-sm text-red-500 mt-2">Error loading deadlines.</p>}
          </CardContent>
        </Card>

        {/* Card 2: Total Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Total Bookings</CardTitle>
            <CardDescription>Overall booking statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
             {statusError ? (
                 <p className="text-sm text-red-500">Error loading counts.</p>
             ) : (
                 <>
                    <p>Total: <span className="font-medium">{bookingCounts.total}</span></p>
                    <p>Confirmed: <span className="font-medium">{bookingCounts.confirmed}</span></p>
                    <p>Waiting List: <span className="font-medium">{bookingCounts.waitingList}</span></p>
                 </>
             )}
          </CardContent>
        </Card>

        {/* Card 3: Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest booking updates</CardDescription>
          </CardHeader>
          <CardContent>
           {recentBookings && recentBookings.length > 0 ? (
               <ul className="space-y-2">
                {recentBookings.map((booking) => (
                  <li key={booking.id} className="text-sm">
                     <Link href={`/bookings/${booking.id}`} className="hover:underline font-medium">
                       {booking.booking_reference || 'No Ref'}
                     </Link>
                     <span className="text-muted-foreground ml-2">({booking.customers?.company_name || 'Unknown Co.'}) - {booking.status}</span>
                     <span className="block text-xs text-muted-foreground">Created: {formatDate(booking.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                (No recent activity)
              </p>
            )}
             {recentError && <p className="text-sm text-red-500 mt-2">Error loading recent activity.</p>}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
