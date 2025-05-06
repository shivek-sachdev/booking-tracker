'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { getPaginatedBookingsForLinking, type LinkedBookingSelectItem } from '@/app/bookings/actions'; // Corrected import
import { type BookingStatus } from '@/types/database'; // Ensure path is correct
import { Loader2, X, Check } from 'lucide-react';

interface BookingReferenceSelectorProps {
  selectedBookingId: string | null;
  onSelectBooking: (id: string | null, description: string | null) => void;
  // We might need the initial description if an ID is pre-selected
  initialDescription?: string | null; 
}

const PAGE_SIZE = 5; // Number of items per page in the modal

export function BookingReferenceSelector({
  selectedBookingId,
  onSelectBooking,
  initialDescription,
}: BookingReferenceSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{ bookings: LinkedBookingSelectItem[]; totalCount: number }>({ bookings: [], totalCount: 0 });
  const [selectedBookingDescription, setSelectedBookingDescription] = React.useState<string | null>(initialDescription ?? null);

  React.useEffect(() => {
    // Update description if initial ID changes (relevant for edit forms)
    if (selectedBookingId && !initialDescription) {
      // If we have an ID but no description, clear description until modal provides one
      // Or potentially fetch description here if needed immediately 
      setSelectedBookingDescription(null); 
    } else {
      setSelectedBookingDescription(initialDescription ?? null);
    }
  }, [selectedBookingId, initialDescription]);

  React.useEffect(() => {
    if (isOpen) {
      fetchData(currentPage);
    }
  }, [isOpen, currentPage]);

  const fetchData = async (page: number, searchTerm?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPaginatedBookingsForLinking(page, PAGE_SIZE, searchTerm);
      if (result.error) {
        setError(result.error);
        setData({ bookings: [], totalCount: 0 });
      } else {
        setData({ bookings: result.bookings, totalCount: result.totalCount });
      }
    } catch (err) { 
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load booking references. Please try again.");
      setData({ bookings: [], totalCount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (booking: LinkedBookingSelectItem) => {
    const customerName = booking.customer_name || 'Unknown Customer';
    const pnr = booking.booking_reference || 'No PNR';
    const travelDate = booking.earliest_travel_date ? formatDate(booking.earliest_travel_date) : 'No Date';
    const status = booking.status || 'No Status';
    const description = `${customerName} (${pnr}) - Travel: ${travelDate} - Status: ${status}`;

    setSelectedBookingDescription(description);
    onSelectBooking(booking.id, description);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedBookingDescription(null);
    onSelectBooking(null, null);
  };

  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  // Format date helper (consider moving to utils if used elsewhere)
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '-';
      try {
          return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD
      } catch {
          return 'Invalid Date';
      }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Select Booking Reference</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Select Linked Booking</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                 <p className="text-center text-red-500 py-4">{error}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Reference (PNR)</TableHead>
                      <TableHead>Travel Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bookings.length > 0 ? (
                      data.bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-xs">{booking.id.substring(0,8)}...</TableCell>
                          <TableCell>{booking.customer_name || '-'}</TableCell>
                          <TableCell>{booking.booking_reference || '-'}</TableCell>
                          <TableCell>{formatDate(booking.earliest_travel_date)}</TableCell>
                          <TableCell>{booking.status || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleSelect(booking)}
                            >
                              <Check className="h-4 w-4 mr-1"/> Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No bookings found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            {totalPages > 1 && !isLoading && !error && (
              <DialogFooter className="pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e: React.MouseEvent) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} 
                        aria-disabled={currentPage <= 1}
                        tabIndex={currentPage <= 1 ? -1 : undefined}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                        />
                    </PaginationItem>
                    {/* Simple page number display for brevity */} 
                    <PaginationItem>
                        <span className="px-4 text-sm font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e: React.MouseEvent) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} 
                        aria-disabled={currentPage >= totalPages}
                        tabIndex={currentPage >= totalPages ? -1 : undefined}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                        />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {selectedBookingId && (
          <Button variant="ghost" size="icon" onClick={handleClear} title="Clear selection">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {selectedBookingId ? (
        <p className="text-sm text-muted-foreground">
          Selected: {selectedBookingDescription || selectedBookingId}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No booking selected.</p>
      )}
    </div>
  );
} 