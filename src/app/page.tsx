import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSimpleServerClient } from "@/lib/supabase/server";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Clock, 
  FileSpreadsheet,
  ArrowUpRight,
  Building,
  BarChart,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard, MetricItem } from "@/components/ui/dashboard-card";

// Helper function to format dates (optional, adjust as needed)
function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM d, yyyy');
}

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

// Define proper types for the status counts data
type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'unconfirmed';

// Define the type for sectors data
interface BookingSector {
  id: string;
  travel_date?: string | null;
}

// Define customer count type
interface CustomerCount {
  customer_id: string;
  company_name: string;
  count: number;
  percentage: number;
}

// Define the type for bookings data
interface BookingData {
  id: string;
  booking_reference?: string;
  status?: BookingStatus;
  deadline?: string;
  customer_id?: string;
  created_at?: string;
  customers?: {
    company_name: string;
  };
  booking_sectors: BookingSector[];
}

// The page component is now async to allow data fetching
export default async function DashboardPage() {
  const supabase = createSimpleServerClient();

  // Fetch total bookings and count by status
  console.log('Attempting to fetch bookings...');
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, booking_reference, status, deadline, customer_id, created_at, customers(company_name)');

  if (bookingsError) {
    console.error('Error fetching bookings:', {
      message: bookingsError.message,
      code: bookingsError.code,
      details: bookingsError.details,
      hint: bookingsError.hint
    });
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
  }

  console.log('Bookings data received:', {
    count: bookings?.length || 0,
    firstBooking: bookings?.[0] || null
  });

  // Cast the data to the proper type using an unknown intermediate
  const bookingsData = (bookings as unknown) as BookingData[] || [];
  const totalBookings = bookingsData.length || 0;

  // Count bookings by customer
  const customerCounts = bookingsData.reduce((acc: Record<string, { id: string, name: string, count: number }>, booking) => {
    if (booking.customers && booking.customers.company_name) {
      const customerId = booking.customer_id || '';
      const customerName = booking.customers.company_name;
      
      if (!acc[customerId]) {
        acc[customerId] = { id: customerId, name: customerName, count: 0 };
      }
      acc[customerId].count++;
    }
    return acc;
  }, {});

  // Format customer data for display
  const customerData: CustomerCount[] = Object.values(customerCounts || {})
    .map(({ id, name, count }) => ({
      customer_id: id,
      company_name: name,
      count,
      percentage: totalBookings ? Math.round((count / totalBookings) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Get the total number of customers
  const totalCustomers = customerData.length;

  // Count bookings by status
  const statusCounts = bookingsData.reduce((acc: Record<string, number>, booking) => {
    const status = booking.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Get dates for last 7 days and count bookings per day
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return format(date, 'yyyy-MM-dd');
  }).reverse();

  const dailyBookings = last7Days.map(day => {
    const count = bookingsData.filter(b => {
      const bookingDate = b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : null;
      return bookingDate === day;
    }).length || 0;
    
    return {
      date: format(new Date(day), 'MMM d'),
      count,
    };
  });

  // Calculate percentages for progress indicators
  const maxDailyBooking = Math.max(...dailyBookings.map(d => d.count), 1);

  // 1. Bookings with deadlines today, tomorrow, or past deadlines
  // Format dates for database queries
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayFormatted = today.toISOString().split('T')[0];
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  console.log(`Fetching deadlines including today (${todayFormatted}), tomorrow (${tomorrowFormatted}), and past deadlines`);
  
  // Define the proper return type for the query
  type DeadlineQueryResult = {
    id: string;
    booking_reference: string | null;
    deadline: string | null;
    customer_id: string;
    status: string;
    booking_type: string;
    customers: {
      company_name: string;
    } | null;
    booking_sectors: {
      id: string;
      travel_date: string | null;
    }[];
  };
  
  const { data: approachingDeadlines, error: deadlineError } = await supabase
    .from("bookings")
    .select(`
      id, 
      booking_reference, 
      deadline, 
      customer_id, 
      status, 
      booking_type,
      customers(company_name),
      booking_sectors(id, travel_date)
    `)
    .not('deadline', 'is', null)
    .not('status', 'eq', 'Cancelled') // Exclude cancelled bookings
    .in('status', ['Confirmed', 'Waiting List']) // Only include these statuses
    .lte('deadline', tomorrowFormatted) // Get deadlines up to and including tomorrow
    .order("deadline", { ascending: true })
    .returns<DeadlineQueryResult[]>();
    
  if (deadlineError) {
    console.error("Supabase query error details:", {
      message: deadlineError.message,
      code: deadlineError.code,
      details: deadlineError.details,
      hint: deadlineError.hint
    });
  } else {
    console.log(`Found ${approachingDeadlines?.length || 0} deadlines (today, tomorrow, and past)`);
    console.log("First deadline item:", approachingDeadlines?.[0]);
  }

  // Helper function to check if a deadline is today
  const isToday = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    return dateString.includes(todayFormatted);
  };

  // Helper function to check if a deadline is tomorrow
  const isTomorrow = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    return dateString.includes(tomorrowFormatted);
  };

  // Helper function to check if a deadline is in the past
  const isPastDeadline = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const deadlineDate = new Date(dateString);
    deadlineDate.setHours(23, 59, 59); // End of the deadline day
    return deadlineDate < today;
  };

  // Helper to get deadline status text and style
  const getDeadlineStatus = (deadline: string | null | undefined) => {
    if (!deadline) return { text: 'No Deadline', style: 'bg-gray-100 text-gray-800' };
    
    if (isPastDeadline(deadline)) {
      const days = Math.ceil(Math.abs(new Date().getTime() - new Date(deadline).getTime()) / (1000 * 3600 * 24));
      return { 
        text: `Overdue by ${days} day${days > 1 ? 's' : ''}!`, 
        style: 'bg-red-100 text-red-800 font-bold'
      };
    }
    
    if (isToday(deadline)) {
      return { text: 'Due Today!', style: 'bg-red-100 text-red-800 font-bold' };
    }
    
    if (isTomorrow(deadline)) {
      return { text: 'Due Tomorrow', style: 'bg-amber-100 text-amber-800' };
    }
    
    return { text: formatDate(deadline), style: 'bg-gray-100 text-gray-800' };
  };

  // Helper to format travel dates
  const formatTravelDates = (booking: DeadlineQueryResult): string => {
    if (!booking.booking_sectors || booking.booking_sectors.length === 0) {
      return "N/A";
    }

    // Sort sectors by travel date
    const sortedSectors = [...booking.booking_sectors]
      .filter(sector => sector.travel_date)
      .sort((a, b) => {
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
    return sortedSectors.map(s => formatShortDate(s.travel_date)).join(", ");
  };

  // Count urgent deadlines
  const urgentDeadlinesCount = (approachingDeadlines || []).filter(
    booking => isPastDeadline(booking.deadline) || isToday(booking.deadline)
  ).length;

  // --- Render Dashboard --- 
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* First Row: Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <DashboardCard
          title="Total Bookings"
          value={totalBookings}
          icon={<FileSpreadsheet className="h-4 w-4 text-blue-500" />}
        />
        
        <DashboardCard
          title="Total Customers"
          value={totalCustomers}
          icon={<Building className="h-4 w-4 text-green-500" />}
        />

        <DashboardCard
          title="Urgent Deadlines"
          value={urgentDeadlinesCount}
          icon={<Clock className="h-4 w-4 text-red-500" />}
          description="Past due and today's deadlines"
        />

        <DashboardCard
          title="Confirmed Bookings"
          value={statusCounts['Confirmed'] || 0}
          icon={<Star className="h-4 w-4 text-amber-500" />}
          description={`${Math.round(((statusCounts['Confirmed'] || 0) / totalBookings) * 100)}% of total`}
        />
      </div>
      
      {/* Second Row: Top Customers */}
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
              Top Customers
            </CardTitle>
            <CardDescription>Booking distribution by customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customerData.length ? (
                customerData.slice(0, 5).map(customer => (
                  <MetricItem
                    key={customer.customer_id}
                    label={customer.company_name}
                    value={customer.count}
                    secondaryValue={`${customer.percentage}%`}
                    progress={customer.percentage}
                    progressColor={`bg-blue-${Math.min(600, 300 + customer.percentage * 3)}`}
                  />
                ))
              ) : (
                <p className="text-muted-foreground">No customer data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approaching Deadlines Table Wrapper */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="mr-2 h-5 w-5 text-red-500" /> 
          Approaching & Passed Deadlines
        </h2>
        
        {/* Desktop view (table) */}
        <div className="hidden md:block overflow-x-auto">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approachingDeadlines && approachingDeadlines.length > 0 ? (
                    approachingDeadlines.map((booking) => {
                      const deadlineStatus = getDeadlineStatus(booking.deadline);
                      
                      return (
                        <TableRow key={booking.id} className={isPastDeadline(booking.deadline) ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            {booking.booking_reference || 'No Ref'}
                          </TableCell>
                          <TableCell>{booking.customers?.company_name || 'Unknown Co.'}</TableCell>
                          <TableCell>{formatTravelDates(booking)}</TableCell>
                          <TableCell>{formatDate(booking.deadline)}</TableCell>
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
                            <span className={`px-2 py-1 rounded-full text-xs ${deadlineStatus.style}`}>
                              {deadlineStatus.text}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center">
                              View<ArrowUpRight className="ml-1 h-3 w-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No bookings with approaching or passed deadlines
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableCaption>
                  {deadlineError ? (
                    <p className="text-red-500">Error loading deadlines: {deadlineError.message}</p>
                  ) : (
                    `Showing ${approachingDeadlines?.length || 0} booking(s) with upcoming or passed deadlines`
                  )}
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile view (cards) */}
        <div className="md:hidden">
          {approachingDeadlines && approachingDeadlines.length > 0 ? (
            <div className="space-y-4">
              {approachingDeadlines.map((booking) => {
                const deadlineStatus = getDeadlineStatus(booking.deadline);
                
                return (
                  <Card key={booking.id} className={isPastDeadline(booking.deadline) ? 'bg-red-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-medium">{booking.booking_reference || 'No Ref'}</div>
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
                      
                      <div className="grid gap-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Customer:</span>
                          <span className="text-sm font-medium">{booking.customers?.company_name || 'Unknown Co.'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Travel Date:</span>
                          <span className="text-sm font-medium">{formatTravelDates(booking)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Deadline:</span>
                          <span className="text-sm font-medium">{formatDate(booking.deadline)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Urgency:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${deadlineStatus.style}`}>
                            {deadlineStatus.text}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Link 
                          href={`/bookings/${booking.id}`} 
                          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                        >
                          View Booking<ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No bookings with approaching or passed deadlines
              </CardContent>
            </Card>
          )}
          
          {deadlineError && (
            <p className="text-red-500 mt-2 text-sm">Error loading deadlines: {deadlineError.message}</p>
          )}
          
          {!deadlineError && approachingDeadlines && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Showing {approachingDeadlines.length} booking(s) with upcoming or passed deadlines
            </p>
          )}
        </div>
      </div>

      {/* Weekly Booking Trends */}
      <div className="hidden md:grid grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-blue-500" />
              Weekly Booking Trends
            </CardTitle>
            <CardDescription>Booking activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <div className="flex h-full items-end gap-2 justify-between px-6">
              {dailyBookings.map((day) => (
                <div key={day.date} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-blue-500 rounded-t" 
                    style={{ height: `${(day.count / maxDailyBooking) * 200}px` }}
                  ></div>
                  <div className="mt-2 text-sm font-medium">{day.date}</div>
                  <div className="text-sm text-muted-foreground">{day.count} bookings</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
