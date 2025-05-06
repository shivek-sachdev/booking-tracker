import { type TourPackageBookingWithProduct, type PaymentRecord, type TourPackageStatus } from "@/lib/types/tours";
import { getTourPackageBookingById, getPaymentsForBooking } from "@/lib/actions/tour-package-bookings";
import { notFound } from 'next/navigation';
import Link from "next/link";
import { ArrowLeft, Edit, Eye, Trash2, CheckCircle, AlertCircle, CircleDollarSign, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Table, 
    TableBody, 
    TableCaption, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { PaymentActions } from '@/components/tour-packages/payment-actions';
import { 
    formatDate, 
    formatTimestamp, 
    formatCurrency, 
    getStatusVariant,
    openStatusBadgeClass
} from '@/lib/utils/formatting';

// Reusable helper functions (consider moving to a shared utils file)
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

  // Fetch booking and payments concurrently
  let booking: TourPackageBookingWithProduct | null = null;
  let payments: PaymentRecord[] = [];
  let fetchError: string | null = null;

  try {
      [booking, payments] = await Promise.all([
          getTourPackageBookingById(id),
          getPaymentsForBooking(id)
      ]);
  } catch (error) {
      console.error(`Error fetching details/payments for ${id}:`, error);
      fetchError = error instanceof Error ? error.message : "Failed to load booking data.";
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

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Booking Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        {/* Details Tab Content */}
        <TabsContent value="details">
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
                     <DetailItem label="Tour Package" value={booking.tour_products?.name} />
                     <DetailItem label="Booking Date" value={formatDate(booking.booking_date)} />
                     <DetailItem label="Status" value={
                         <Badge 
                            variant={booking.status === 'Open' ? 'outline' : getStatusVariant(booking.status)}
                            className={booking.status === 'Open' ? openStatusBadgeClass : ''}
                         >
                             {booking.status}
                         </Badge>
                     } />
                     {/* Add Linked PNR Display */}
                     <DetailItem label="Linked Ticket Booking PNR" value={booking.linked_booking_pnr || 'N/A'} />
                 </div>
                 {/* Right Column */}
                 <div>
                     <DetailItem label="Base Price per PAX" value={formatCurrency(booking.base_price_per_pax)} />
                     <DetailItem label="PAX" value={booking.pax} />
                     <DetailItem label="Total per Person" value={formatCurrency(booking.total_per_pax)} />
                     <DetailItem label="Grand Total" value={formatCurrency(booking.grand_total)} />
                     <DetailItem label="Travel Period" value={formatTravelPeriod(booking.travel_start_date, booking.travel_end_date)} />
                 </div>
                 {/* Addons Section (Full Width if it exists, or below notes) */}
                 {booking.addons && Array.isArray(booking.addons) && booking.addons.length > 0 && (
                    <div className="md:col-span-2 mt-4 pt-4 border-t">
                        <h3 className="text-md font-semibold mb-2 text-muted-foreground">Additional Costs:</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            {booking.addons.map((addon) => (
                                <li key={addon.id} className="flex justify-between">
                                    <span>{addon.name}</span>
                                    <span>{formatCurrency(addon.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
                 {/* Notes Section (Full Width) */}
                 <div className="md:col-span-2 mt-4 pt-4 border-t">
                     <DetailItem label="Notes" value={booking.notes || <span className="italic text-muted-foreground">No notes</span>} />
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updated Payments Tab Content */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of uploaded payment slips for this booking.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No payment records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Mirror structure from ledger page */}
                      <TableHead className="w-[25%]">Uploaded Date</TableHead>
                      <TableHead className="w-[25%]">Status at Payment</TableHead>
                      <TableHead className="w-[25%]">Verification Status</TableHead> 
                      <TableHead className="w-[25%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        {/* Use formatTimestamp for uploaded_at */}
                        <TableCell>{formatTimestamp(payment.uploaded_at)}</TableCell>
                        {/* Use Badge with getStatusVariant */}
                        <TableCell><Badge variant={getStatusVariant(payment.status_at_payment)}>{payment.status_at_payment}</Badge></TableCell>
                        
                        {/* Verification Status Cell - Copied logic from ledger */}
                        <TableCell>
                          {payment.is_verified ? (
                            <div className="flex flex-col text-xs" title="Payment slip verified successfully">
                              <div className="flex items-center text-green-600"><CheckCircle className="mr-1 h-3 w-3 flex-shrink-0" /> Verified</div>
                              {payment.verified_amount && (
                                  <div className="flex items-center text-muted-foreground"><CircleDollarSign className="mr-1 h-3 w-3 flex-shrink-0" /> {formatCurrency(payment.verified_amount)}</div>
                              )}
                              {payment.verified_payment_date && (
                                  <div className="flex items-center text-muted-foreground">
                                    <CalendarDays className="mr-1 h-3 w-3 flex-shrink-0" /> 
                                    Paid on: {formatDate(payment.verified_payment_date)}
                                  </div>
                              )}
                              {payment.verified_at && (
                                  <div className="flex items-center text-muted-foreground mt-1">
                                    <Clock className="mr-1 h-3 w-3 flex-shrink-0" /> 
                                    Verified on: {formatTimestamp(payment.verified_at)}
                                  </div>
                              )}
                            </div>
                          ) : payment.verification_error ? (
                            <div className="flex items-center text-xs text-red-500" title={`Error: ${payment.verification_error}`}>
                              <AlertCircle className="mr-1 h-3 w-3 flex-shrink-0" /> Failed
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">Pending</div>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <PaymentActions payment={payment} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 