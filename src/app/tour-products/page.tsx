'use client'; // Make page client component for dialog state if needed

import * as React from 'react'; // Import React
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
// Import the Dialog component we will create
import { TourPackageFormDialog } from './components/tour-package-form-dialog';
import { TourProductsTable } from './components/tour-products-table';
import { DataTableSkeleton } from '@/components/data-table-skeleton';
// Keep server action import if needed for initial data fetch
import { getTourProducts } from '@/lib/actions/tour-products';
import type { TourProduct } from '@/lib/types/tours'; // Import type
import { toast } from "sonner"; // Import toast

// Removed async as state management might be client-side
export default function TourPackagesPage() {
  // --- State moved from Table --- 
  const [data, setData] = React.useState<TourProduct[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // --- Fetch Data Function --- 
  const fetchData = React.useCallback(async () => {
    console.log("(Page) Fetching tour packages..."); // Log source
    setIsLoading(true);
    setError(null);
    try {
      const products = await getTourProducts();
      setData(products);
      console.log("(Page) Fetched tour packages:", products.length);
    } catch (err) {
      console.error("(Page) Failed to fetch tour packages:", err);
      setError("Failed to load tour packages. Please try again.");
      toast.error("Failed to load tour packages.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Initial Fetch --- 
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tour Packages</h1>
         {/* Replace Link with Dialog Trigger */}
         <TourPackageFormDialog
           mode="add"
           onSuccess={fetchData} // Pass fetchData as onSuccess
           triggerButton={
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Package
             </Button>
           }
         />
      </div>

       {/* Table rendering - Needs adaptation if data fetching moves client-side */}
       {/* We'll keep Suspense for now, assuming TourProductsTable handles data */}
       <Suspense fallback={<DataTableSkeleton columnCount={3} />}>
          {/* Render based on state */}
          {isLoading ? (
             <DataTableSkeleton columnCount={3} /> 
          ) : error ? (
             <div className="text-center py-10 text-red-500">{error}</div>
          ) : (
            <TourProductsTable data={data} onDataRefresh={fetchData} />
          )}
       </Suspense>
    </div>
  );
}

// Remove server-side wrapper for fetching if page is client component
// async function TourProductsTableWrapper({ productsPromise }: { productsPromise: Promise<any[]> }) {
//   const products = await productsPromise;
//   return <TourProductsTable data={products} />;
// } 