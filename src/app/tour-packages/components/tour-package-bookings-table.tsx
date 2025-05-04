'use client';

import * as React from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { type TourPackageBookingWithProduct, type TourPackageStatus } from "@/lib/types/tours";
import { deleteTourPackageBooking } from "@/lib/actions/tour-package-bookings";

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Format travel period concisely
const formatTravelPeriod = (startDateStr: string | null | undefined, endDateStr: string | null | undefined): string => {
  if (!startDateStr) return '-'; // No start date, can't determine period

  try {
    const startDate = new Date(startDateStr + 'T00:00:00');
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    if (!endDateStr || startDateStr === endDateStr) {
      // Only start date or same start/end date
      return `${startDay} ${startMonth}`;
    }

    const endDate = new Date(endDateStr + 'T00:00:00');
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    if (startMonth === endMonth) {
      // Same month
      return `${startDay}-${endDay} ${startMonth}`;
    } else {
      // Different months
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
  } catch {
    return 'Invalid Dates';
  }
};

// Helper function to determine Badge variant based on status
const getStatusVariant = (status: TourPackageStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    // Green / Success states
    case 'Complete': 
    case 'Paid (Full Payment)':
      return 'default'; 
    // Gray / Neutral / Completed initial step
    case 'Paid (1st installment)':
      return 'secondary'; 
    // Yellow / Warning / Action needed
    case 'Open':
    case 'Negotiating':
      return 'outline'; 
    // Red / Problem states
    case 'Closed': // Assuming Closed might indicate cancellation or issue
      return 'destructive'; 
    // Default fallback
    default:
      return 'secondary'; 
  }
};

// Reusable Delete Confirmation Dialog
const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  bookingInfo
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  bookingInfo: string;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the tour booking: {bookingInfo}.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Define Actions Cell Component Separately
const ActionsCell = ({ booking }: { booking: TourPackageBookingWithProduct }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTourPackageBooking(booking.id); 
      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        setIsDeleteDialogOpen(false);
      } else {
        toast.error(result.message); 
      }
    } catch {
      toast.error("An unexpected error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/tour-packages/${booking.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)} 
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            disabled={isDeleting}
          >
              <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          bookingInfo={`Tour Booking for ${booking.customer_name} - ${booking.tour_products?.[0]?.name || 'Unknown Package'}`}
      />
    </>
  );
}

// --- Simplified Table Component ---
interface TourPackageBookingsTableProps {
  data: TourPackageBookingWithProduct[];
}

export function TourPackageBookingsTable({ data }: TourPackageBookingsTableProps) {
  const router = useRouter();
  const headers = [
    'Booking ID',
    'Customer', 
    'Package',
    'Price', 
    'PAX',
    'Booking Date', 
    'Travel Period',
    'Status', 
    'Actions'
  ];

  const handleRowClick = (id: string) => {
    router.push(`/tour-packages/${id}`);
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length ? (
              data.map((booking) => {
                // Log the booking object as received by the table component
                console.log("Booking object in table:", booking);
                return (
                  <TableRow 
                    key={booking.id}
                    onClick={() => handleRowClick(booking.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {booking.id}
                    </TableCell>
                    <TableCell className="font-medium">{booking.customer_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {booking.tour_products?.[0]?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(booking.price)}</TableCell>
                    <TableCell>{booking.pax ?? '-'}</TableCell>
                    <TableCell>{formatDate(booking.booking_date)}</TableCell>
                    <TableCell>{formatTravelPeriod(booking.travel_start_date, booking.travel_end_date)}</TableCell>
                    <TableCell>
                      {booking.status === 'Open' ? (
                         <Badge 
                            variant="outline"
                            className="border-yellow-400 bg-yellow-50 text-yellow-700"
                         >
                            {booking.status}
                         </Badge>
                      ) : (
                         <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status}
                         </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ActionsCell booking={booking} />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} className="h-24 text-center">
                  No tour bookings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 