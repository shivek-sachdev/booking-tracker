import * as React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { getTourProducts } from "@/lib/actions/tour-products"; // Action to fetch products
import { TourPackageBookingForm } from "../components/tour-package-booking-form"; // Corrected import path
import type { TourProduct } from "@/lib/types/tours"; // Import the type
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// Ensure the page is dynamically rendered if needed, but often data fetching makes it dynamic anyway
// export const dynamic = "force-dynamic";

export default async function NewTourPackageBookingPage() {
  // Fetch products and booking references concurrently
  const [products] = await Promise.all([
    getTourProducts(),
  ]);

  // Handle error fetching products
  if (!products || products.length === 0) {
     // Handle case where no products are available
     return (
        <div className="container mx-auto p-4 space-y-4">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Create New Tour Booking</h1>
                <Button variant="outline" asChild>
                    <Link href="/tour-packages">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                    </Link>
                </Button>
            </div>
            <Card>
                 <CardHeader>
                     <CardTitle>No Tour Packages Available</CardTitle>
                     <CardDescription>Cannot create a booking as no tour packages have been defined yet.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <p>Please add tour packages first before creating bookings.</p>
                     {/* Optionally add a link to create tour packages */}
                     {/* <Button asChild><Link href="/tour-products/new">Create Tour Package</Link></Button> */}
                 </CardContent>
            </Card>
        </div>
     )
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
       <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Create New Tour Booking</h1>
            <Button variant="outline" asChild>
                <Link href="/tour-packages">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                </Link>
            </Button>
       </div>
      {/* Render the client component form, passing server-fetched data */}
      <TourPackageBookingForm 
        initialBooking={null} 
        products={products} 
      />
    </div>
  );
} 