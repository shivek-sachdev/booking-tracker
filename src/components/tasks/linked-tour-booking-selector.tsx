'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming you have this hook
import { getPaginatedTourBookingsForLinking } from '@/lib/actions/tasks';
import { type LinkedTourBookingSelectItem } from '@/lib/types/tasks';
import { Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface LinkedTourBookingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking: (booking: LinkedTourBookingSelectItem | null) => void;
  currentLinkedBookingId: string | null;
}

const PAGE_SIZE = 5; // Items per page

// Helper to get badge variant based on tour booking status
// TODO: Centralize this if used elsewhere
type BadgeVariant = "default" | "secondary" | "outline" | "destructive";
const getTourStatusVariant = (status: string | null): BadgeVariant => {
    if (!status) return 'secondary';
    switch (status) {
      case 'Open':
      case 'Negotiating':
        return 'outline';
      case 'Paid (1st installment)':
      case 'Paid (Full Payment)':
        return 'secondary';
      case 'Complete':
        return 'default'; // Like success
      case 'Closed':
        return 'destructive';
      default:
        return 'secondary';
    }
};

// Format date helper
const formatDateSimple = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
        return 'Invalid Date';
    }
};

export function LinkedTourBookingSelector({
  isOpen,
  onClose,
  onSelectBooking,
  currentLinkedBookingId,
}: LinkedTourBookingSelectorProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{ bookings: LinkedTourBookingSelectItem[]; totalCount: number }>({ bookings: [], totalCount: 0 });

  const fetchData = React.useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPaginatedTourBookingsForLinking(page, PAGE_SIZE, search || null);
      if (result.error) {
        setError(result.error);
        setData({ bookings: [], totalCount: 0 });
      } else {
        setData({ bookings: result.bookings, totalCount: result.totalCount });
      }
    } catch (err) {
      console.error("Failed to fetch tour bookings:", err);
      setError("Failed to load tour bookings. Please try again.");
      setData({ bookings: [], totalCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies are page and search, handled in useEffect

  React.useEffect(() => {
    if (isOpen) {
      // Reset page to 1 when search term changes
      setCurrentPage(1);
      fetchData(1, debouncedSearchTerm);
    } else {
        // Reset search term when dialog closes
        setSearchTerm("");
    }
  }, [isOpen, debouncedSearchTerm, fetchData]);

  React.useEffect(() => {
      if (isOpen) {
          fetchData(currentPage, debouncedSearchTerm);
      }
  }, [currentPage, isOpen, debouncedSearchTerm, fetchData]);

  const handleSelect = (booking: LinkedTourBookingSelectItem) => {
    onSelectBooking(booking);
    onClose(); // Close dialog on selection
  };

  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" onEscapeKeyDown={onClose}>
        <DialogHeader>
          <DialogTitle>Select Tour Booking to Link</DialogTitle>
        </DialogHeader>
        <div className="p-4 border-b">
            <Input 
                placeholder="Search by Customer Name or Booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
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
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bookings.length > 0 ? (
                  data.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                      <TableCell>{booking.customer_name || '-'}</TableCell>
                      <TableCell>{booking.package_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getTourStatusVariant(booking.status)}>{booking.status || '-'}</Badge>
                      </TableCell>
                      <TableCell>{formatDateSimple(booking.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant={currentLinkedBookingId === booking.id ? "secondary" : "ghost"}
                          onClick={() => handleSelect(booking)}
                          disabled={currentLinkedBookingId === booking.id}
                        >
                          {currentLinkedBookingId === booking.id ? "Linked" : <><Check className="h-4 w-4 mr-1"/> Select</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No tour bookings found{searchTerm ? ' matching "' + searchTerm + '"' : ''}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        {totalPages > 1 && !isLoading && !error && (
            <Pagination className="mt-4">
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
        )}
      </DialogContent>
    </Dialog>
  );
} 