import { Suspense } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getTourPackageBookingsByStatuses } from '@/lib/actions/tour-package-bookings';
import { TourPackageBookingsTable } from '../components/tour-package-bookings-table';
import { DataTableSkeleton } from '@/components/data-table-skeleton';
import type { TourPackageBookingWithProduct, TourPackageStatus } from '@/lib/types/tours';
import { Button } from '@/components/ui/button';

export default async function CompletedTourBookingsPage() {
  const statuses: TourPackageStatus[] = ['Complete'];
  const bookingsPromise = getTourPackageBookingsByStatuses(statuses);

  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Completed Tour Bookings</h1>
        <Button asChild>
          <Link href="/tour-packages/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Booking
          </Link>
        </Button>
      </div>
      <Suspense fallback={<DataTableSkeleton columnCount={6} />}> 
        <TableWrapper bookingsPromise={bookingsPromise} />
      </Suspense>
    </div>
  );
}

async function TableWrapper({ bookingsPromise }: { bookingsPromise: Promise<TourPackageBookingWithProduct[]> }) {
  const bookings = await bookingsPromise;
  return <TourPackageBookingsTable data={bookings} />;
}


