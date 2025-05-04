import { type TourPackageBookingWithProduct, type TourPackageStatus } from "@/lib/types/tours";
import { getTourPackageBookingById } from "@/lib/actions/tour-package-bookings";
import { notFound } from 'next/navigation';
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Reusable helper functions (consider moving to a shared utils file)
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString + 'T00:00:00'); // Assume date part only
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatTravelPeriod = (startDateStr: string | null | undefined, endDateStr: string | null | undefined): string => {
  if (!startDateStr) return '-';
  try {
    const startDate = new Date(startDateStr + 'T00:00:00');
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    if (!endDateStr || startDateStr === endDateStr) {
      return `${startDay} ${startMonth}`;
    }
    const endDate = new Date(endDateStr + 'T00:00:00');
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${startMonth}`;
    } else {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
  } catch {
    return 'Invalid Dates';
  }
};

const getStatusVariant = (status: TourPackageStatus): "default" | "secondary" | "destructive" | "outline" => {
   switch (status) {
     case 'Complete': case 'Paid (Full Payment)': return 'default'; 
     case 'Paid (1st installment)': return 'secondary'; 
     case 'Open': case 'Negotiating': return 'outline'; // Keep outline for Open/Negotiating
     case 'Closed': return 'destructive'; 
     default: return 'secondary'; 
   }
 };

 // Style specifically for 'Open' status badge
 const openStatusBadgeClass = "border-yellow-400 bg-yellow-50 text-yellow-700";

// Apply the workaround: define props interface with params as Promise
interface TourPackageDetailPageProps {
  params: Promise<{ id: string }> | undefined;
}

// Helper component to display label-value pairs
const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '-'}</p>
    </div>
);

export default async function TourPackageDetailPage({ params }: TourPackageDetailPageProps) {
  // Handle promise and undefined cases, then await
  if (!params) {
    throw new Error("Missing page parameters");
  }
  const resolvedParams = await params;
  const { id } = resolvedParams; // Use the resolved id

  let booking: TourPackageBookingWithProduct | null;
  let fetchError: string | null = null;

  try {
      // Use the resolved id for fetching
      booking = await getTourPackageBookingById(id); 
  } catch (error) {
      console.error(`Error fetching booking details for ${id}:`, error);
      fetchError = error instanceof Error ? error.message : "Failed to load booking details.";
      booking = null;
  }

  // Handle general fetch error
  if (fetchError) {
     // Optionally redirect or show a more specific error component
     return (
        <div className="container mx-auto p-4">
             <Button variant="outline" size="sm" asChild className="mb-4">
                 <Link href="/tour-packages">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                 </Link>
             </Button>
            <p className="text-red-500">Error loading booking: {fetchError}</p>
        </div>
     );
  }

  // If booking not found after successful fetch attempt
  if (!booking) {
    notFound(); // Use Next.js standard 404 page
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header with Back and Edit buttons */}
      <div className="flex justify-between items-center mb-4">
          <Button variant="outline" size="sm" asChild>
             <Link href="/tour-packages">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Bookings
             </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
             <Link href={`/tour-packages/${booking.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Booking
             </Link>
          </Button>
      </div>

      {/* Booking Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Information for Booking ID: <span className="font-mono text-sm">{booking.id}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
             {/* Left Column */}
             <div>
                 <DetailItem label="Customer Name" value={booking.customer_name} />
                 <DetailItem label="Tour Package" value={booking.tour_products?.[0]?.name} />
                 <DetailItem label="Booking Date" value={formatDate(booking.booking_date)} />
                 <DetailItem label="Status" value={
                     <Badge 
                        variant={booking.status === 'Open' ? 'outline' : getStatusVariant(booking.status)}
                        className={booking.status === 'Open' ? openStatusBadgeClass : ''}
                     >
                         {booking.status}
                     </Badge>
                 } />
             </div>
             {/* Right Column */}
             <div>
                 <DetailItem label="Price per PAX" value={formatCurrency(booking.price)} />
                 <DetailItem label="PAX" value={booking.pax} />
                 <DetailItem label="Travel Period" value={formatTravelPeriod(booking.travel_start_date, booking.travel_end_date)} />
                 {/* Add Total if needed: Price * Pax */}
                 {booking.price && booking.pax && (
                     <DetailItem label="Calculated Total" value={formatCurrency(booking.price * booking.pax)} />
                 )}
             </div>
             {/* Notes Section (Full Width) */}
             <div className="md:col-span-2">
                 <DetailItem label="Notes" value={booking.notes || <span className="italic text-muted-foreground">No notes</span>} />
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 