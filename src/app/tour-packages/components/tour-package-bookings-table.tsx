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
import { formatDate, formatTimestamp, formatCurrency } from "@/lib/utils/formatting";

// --- Helper Functions ---

// Format travel period concisely with Thailand timezone
const formatTravelPeriod = (startDateStr: string | null | undefined, endDateStr: string | null | undefined): string => {
  if (!startDateStr) return '-'; // No start date, can't determine period

  try {
    const startDate = new Date(startDateStr + 'T00:00:00');
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('en-US', { 
      month: 'short',
      timeZone: 'Asia/Bangkok'
    }).toUpperCase();

    if (!endDateStr || startDateStr === endDateStr) {
      // Only start date or same start/end date
      return `${startDay} ${startMonth}`;
    }

    const endDate = new Date(endDateStr + 'T00:00:00');
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { 
      month: 'short',
      timeZone: 'Asia/Bangkok'
    }).toUpperCase();

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

// NEW: Helper function to get Tailwind classes for status badges
const getStatusBadgeClasses = (status: TourPackageStatus): string => {
  switch (status) {
    case 'Open':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-700 dark:text-gray-300'; // Grey
    case 'Negotiating':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-700 dark:text-yellow-300'; // Yellow
    case 'Paid (1st installment)':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-700 dark:text-blue-300'; // Blue
    case 'Paid (Full Payment)':
      return 'bg-blue-600 text-white hover:bg-blue-600/80 dark:bg-blue-800 dark:text-blue-100'; // Dark Blue
    case 'Complete':
      return 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-700 dark:text-green-300'; // Green
    case 'Closed':
      return 'bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-700 dark:text-red-300'; // Red
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-700 dark:text-gray-300'; // Default to Grey
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
          bookingInfo={`Tour Booking for ${booking.customer_name} - ${booking.tour_products?.name || 'Unknown Package'}`}
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
    'Total', 
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
                // console.log("Booking object in table:", booking);
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
                      {booking.tour_products?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        // Calculate grand total using new pricing model
                        ((booking.base_price_per_pax || 0) * booking.pax) + 
                        (booking.addons?.reduce((sum, addon) => sum + (addon.amount || 0), 0) || 0)
                      )}
                    </TableCell>
                    <TableCell className="text-center">{booking.pax}</TableCell>
                    <TableCell>{formatDate(booking.booking_date)}</TableCell>
                    <TableCell>{formatTravelPeriod(booking.travel_start_date, booking.travel_end_date)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClasses(booking.status)} variant="outline">
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                      <ActionsCell booking={booking} />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} className="h-24 text-center">
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 