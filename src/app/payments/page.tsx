import { getAllPaymentRecords } from "@/lib/actions/tour-package-bookings";
import { PaymentLedgerItem, type TourPackageStatus } from "@/lib/types/tours";
import Link from "next/link";
import {
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentActions } from "../tour-packages/components/payment-actions"; // Re-use PaymentActions
import { Badge } from "@/components/ui/badge";

// Helper function to format dates (could be moved to utils)
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', // Use short month for table
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
    });
  } catch {
    return 'Invalid Date';
  }
};

// Copy the getStatusVariant function here
const getStatusVariant = (status: TourPackageStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    // Green / Success states
    case "Complete": 
    case "Paid (Full Payment)":
      return "default"; 
    // Gray / Neutral / Completed initial step
    case "Paid (1st installment)":
      return "secondary"; 
    // Yellow / Warning / Action needed (Outline matches the booking table)
    case "Open":
    case "Negotiating":
      return "outline"; 
    // Red / Problem states
    case "Closed": 
      return "destructive"; 
    // Default fallback
    default:
      return "secondary"; 
  }
};

export default async function PaymentsLedgerPage() {
  const payments = await getAllPaymentRecords();

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Payments Ledger</h1>
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Chronological list of all payment slips uploaded.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uploaded</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status @ Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center"><span className="italic text-muted-foreground">No payment records found.</span></TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs">{formatDate(payment.uploaded_at)}</TableCell>
                    <TableCell>{payment.customer_name || '-'}</TableCell>
                    <TableCell>
                      <Link href={`/tour-packages/${payment.tour_package_booking_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {payment.tour_package_booking_id}
                      </Link>
                    </TableCell>
                    <TableCell>{payment.package_name || '-'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(payment.status_at_payment)}>{payment.status_at_payment}</Badge></TableCell>
                    <TableCell>
                      {/* Reuse PaymentActions for View/Delete functionality */}
                      <PaymentActions paymentId={payment.id} slipPath={payment.payment_slip_path} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 