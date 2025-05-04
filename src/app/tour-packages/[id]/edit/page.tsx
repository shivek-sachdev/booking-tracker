import { getTourPackageBookingById } from "@/lib/actions/tour-package-bookings";
import { getTourProducts } from "@/lib/actions/tour-products";
import { TourPackageBookingForm } from "../../components/tour-package-booking-form";
import { notFound } from 'next/navigation';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourProduct } from "@/lib/types/tours";
import { getBookingReferences, type BookingReference } from "@/app/bookings/actions";
import { type TourPackageBookingWithProduct } from "@/lib/types/tours";
import { getPaymentsForBooking } from "@/lib/actions/tour-package-bookings";
import { type PaymentRecord } from "@/lib/types/tours";

// Apply the workaround found in the bookings edit page
interface EditTourPackageBookingPageProps {
  // Type params as a Promise to satisfy internal type checker
  params: Promise<{ id: string }> | undefined;
}

export default async function EditTourPackageBookingPage({ params }: EditTourPackageBookingPageProps) {
  // Handle both Promise and undefined cases
  if (!params) {
    throw new Error("Missing page parameters");
  }
  // Await the params promise
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  // Fetch the specific booking and the list of all products concurrently
  let booking: TourPackageBookingWithProduct | null;
  let products: TourProduct[];
  let bookingReferences: BookingReference[];
  let payments: PaymentRecord[];
  let fetchError: string | null = null;
  try {
      const [bookingResult, productsResult, referencesResult, paymentsResult] = await Promise.all([
        getTourPackageBookingById(id),
        getTourProducts(),
        getBookingReferences(),
        getPaymentsForBooking(id)
      ]);
      booking = bookingResult;
      products = productsResult;
      bookingReferences = referencesResult;
      payments = paymentsResult;
  } catch (error) {
      console.error("Error fetching data for edit page:", error);
      fetchError = error instanceof Error ? error.message : "Failed to load booking data.";
      // Set defaults or handle error state
      booking = null;
      products = []; 
      bookingReferences = [];
      payments = [];
  }

  // Handle general fetch error
  if (fetchError) {
     return (
        <div className="container mx-auto p-4 space-y-4">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Edit Tour Booking</h1>
                <Button variant="outline" asChild>
                    <Link href="/tour-packages">
                       <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                    </Link>
                </Button>
           </div>
            <p className="text-red-500">Error: {fetchError}</p>
        </div>
     );
  }

  // If booking not found after fetch attempt (and no general error)
  if (!booking) {
    // You could redirect or show a specific 'not found' component here
    // For now, using the standard notFound() from Next.js
    notFound();
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
       <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold">Edit Tour Booking</h1>
            <Button variant="outline" asChild>
                <Link href="/tour-packages">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                </Link>
            </Button>
       </div>
      {/* Pass the fetched booking and product data to the form */}
      <TourPackageBookingForm 
        initialBooking={booking} 
        products={products ?? []} // Ensure products is always an array
        bookingReferences={bookingReferences ?? []}
        payments={payments ?? []}
      />
    </div>
  );
}

// Optional: Metadata for title
// export async function generateMetadata({ params }: EditTourPackageBookingPageProps): Promise<Metadata> {
//   const booking = await getTourPackageBookingById(params.id);
//   return {
//     title: `Edit Tour Booking for ${booking?.customer_name || '-'}`,
//   };
// } 