'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getPaginatedBookingsForLinking, type LinkedBookingSelectItem } from '@/app/bookings/actions';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming you have or will create this hook
import { format } from 'date-fns';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LinkedBookingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking: (booking: LinkedBookingSelectItem) => void;
  currentLinkedBookingId?: string | null;
}

const PAGE_SIZE = 5; // Or any other suitable page size

export function LinkedBookingSelectionModal({
  isOpen,
  onClose,
  onSelectBooking,
  currentLinkedBookingId,
}: LinkedBookingSelectionModalProps) {
  const [bookings, setBookings] = React.useState<LinkedBookingSelectItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchBookings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPaginatedBookingsForLinking(currentPage, PAGE_SIZE, debouncedSearchTerm);
      if (result.error) {
        setError(result.error);
        setBookings([]);
        setTotalCount(0);
      } else {
        setBookings(result.bookings);
        setTotalCount(result.totalCount);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
      setError(errorMessage);
      setBookings([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  React.useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen, fetchBookings]);

  // Reset page to 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSelectAndClose = (booking: LinkedBookingSelectItem) => {
    onSelectBooking(booking);
    onClose();
  };

  const renderPaginationItems = () => {
    const items = [];
    // Always show first page
    items.push(
      <PaginationItem key="page-1">
        <PaginationLink
          href="#"
          onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4);
    }
    if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
    }
    
    if (startPage > 2) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={`page-${i}`}>
          <PaginationLink
            href="#"
            onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages - 1) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={`page-${totalPages}`}>
          <PaginationLink
            href="#"
            onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Ticket Booking to Link</DialogTitle>
          <DialogDescription>
            Search and select a ticket booking to link to this tour package.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Booking Ref or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading bookings...</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="text-red-500 text-center py-4">
            <p>Error fetching bookings: {error}</p>
            <Button onClick={fetchBookings} variant="outline" className="mt-2">Try Again</Button>
          </div>
        )}
        {!isLoading && !error && bookings.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No bookings found matching your criteria.</p>
        )}

        {!isLoading && !error && bookings.length > 0 && (
          <div className="overflow-auto max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Travel Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className={currentLinkedBookingId === booking.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{booking.booking_reference || 'N/A'}</TableCell>
                    <TableCell>{booking.customer_name || 'N/A'}</TableCell>
                    <TableCell>
                      {booking.earliest_travel_date
                        ? format(new Date(booking.earliest_travel_date), 'MMM d, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell><Badge variant={booking.status === 'Cancelled' ? 'destructive' : 'outline'}>{booking.status || 'N/A'}</Badge></TableCell>
                    <TableCell>{format(new Date(booking.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAndClose(booking)}
                        disabled={currentLinkedBookingId === booking.id}
                      >
                        {currentLinkedBookingId === booking.id ? 'Selected' : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && !isLoading && !error && bookings.length > 0 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage((prev) => Math.max(1, prev - 1)); }}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : undefined}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage((prev) => Math.min(totalPages, prev + 1)); }}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : undefined}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A simple debounce hook (you might have this in a utils/hooks file)
// If not, you'll need to create this file: src/hooks/use-debounce.ts
// Example:
// import { useState, useEffect } from 'react';
// export function useDebounce<T>(value: T, delay: number): T {
//   const [debouncedValue, setDebouncedValue] = useState<T>(value);
//   useEffect(() => {
//     const handler = setTimeout(() => {
//       setDebouncedValue(value);
//     }, delay);
//     return () => {
//       clearTimeout(handler);
//     };
//   }, [value, delay]);
//   return debouncedValue;
// } 