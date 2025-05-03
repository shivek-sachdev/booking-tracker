import { getTourProductById } from "@/lib/actions/tour-products";
import { TourProductForm } from "../../components/tour-product-form";
import { notFound } from 'next/navigation';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Apply the workaround: define props interface with params as Promise
interface EditTourProductPageProps {
  params: Promise<{ id: string }> | undefined; // Product ID from the URL
}

export default async function EditTourProductPage({ params }: EditTourProductPageProps) {
  // Handle promise and undefined cases, then await
  if (!params) {
    throw new Error("Missing page parameters");
  }
  const resolvedParams = await params;
  const { id } = resolvedParams; // Use the resolved id

  // Use the resolved id for fetching
  const product = await getTourProductById(id);

  // If product not found, render 404 page
  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/tour-products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Packages
        </Link>
      </Button>
      <h1 className="text-2xl font-bold mb-6">Edit Tour Package</h1>
      {/* Pass the fetched product data to the form */}
      <TourProductForm initialProduct={product} />
    </div>
  );
}

// Optional: Add generateMetadata function if needed for SEO/Title
// export async function generateMetadata({ params }: EditTourProductPageProps): Promise<Metadata> {
//   const product = await getTourProductById(params.id);
//   return {
//     title: `Edit ${product?.name || 'Tour Package'}`,
//   };
// } 