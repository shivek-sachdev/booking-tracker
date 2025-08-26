import { Suspense } from 'react';
import { getTourPackageBookingsExcludingStatuses } from '@/lib/actions/tour-package-bookings';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { TourPackageBookingsTable } from './components/tour-package-bookings-table'; // We will create this next
import { DataTableSkeleton } from '@/components/data-table-skeleton';
import type { TourPackageBookingWithProduct } from '@/lib/types/tours';

export default async function TourPackageBookingsPage() {
  // Exclude finalized statuses from All
  const bookingsPromise = getTourPackageBookingsExcludingStatuses(['Complete', 'Closed']);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tour Bookings</h1>
        <Button asChild>
          <Link href="/tour-packages/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Booking
          </Link>
        </Button>
      </div>

      <Suspense fallback={<DataTableSkeleton columnCount={6} />}> {/* Adjust column count */} 
        {/* Resolve the promise inside Suspense boundary */}
        <TourPackageBookingsTableWrapper bookingsPromise={bookingsPromise} />
      </Suspense>
    </div>
  );
}

// Helper component to await the promise within Suspense
async function TourPackageBookingsTableWrapper({ bookingsPromise }: { bookingsPromise: Promise<TourPackageBookingWithProduct[]> }) {
  const bookings = await bookingsPromise;
  return <TourPackageBookingsTable data={bookings} />;
} 