import { getAllPaymentRecords } from "@/lib/actions/tour-package-bookings";
import { PaymentLedgerItem } from "@/lib/types/tours";
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
import { PaymentActions } from "@/components/tour-packages/payment-actions";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, CircleDollarSign, CalendarDays, Clock } from 'lucide-react';
import { 
    formatDate, 
    formatTimestamp, 
    formatCurrency, 
    getStatusVariant 
} from '@/lib/utils/formatting';

export default async function PaymentsLedgerPage() {
  const payments = await getAllPaymentRecords();

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Payments Ledger</h1>
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Chronological list of all payment slips uploaded and their verification status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[15%]">Uploaded</TableHead>
                <TableHead className="w-[15%]">Customer</TableHead>
                <TableHead className="w-[10%]">Booking ID</TableHead>
                <TableHead className="w-[15%]">Package</TableHead>
                <TableHead className="w-[15%]">Status @ Payment</TableHead>
                <TableHead className="w-[15%]">Verification Status</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center"><span className="italic text-muted-foreground">No payment records found.</span></TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs">{formatTimestamp(payment.uploaded_at)}</TableCell>
                    <TableCell>{payment.customer_name || '-'}</TableCell>
                    <TableCell>
                      <Link href={`/tour-packages/${payment.tour_package_booking_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {payment.tour_package_booking_id}
                      </Link>
                    </TableCell>
                    <TableCell>{payment.package_name || '-'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(payment.status_at_payment)}>{payment.status_at_payment}</Badge></TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 