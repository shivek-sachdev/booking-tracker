'use server';

import { z } from 'zod';
import { createSimpleServerClient } from '@/lib/supabase/server';
import { TourProductSchema, type TourProduct } from '@/lib/types/tours';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// TODO: Implement actions: createTourProduct, updateTourProduct, deleteTourProduct, getTourProducts, getTourProductById 

// --- Helper Type for Action State ---
type FormState = {
  message: string;
  errors?: Record<string, string[]>;
};

// --- Types for Top Selling Packages ---
export interface TopSellingPackage {
  id: string;
  name: string;
  destination: string;
  sales: number;
  revenue: number;
  growth: string;
  progressValue: number;
}

export interface TopSellingStats {
  totalPackagesSold: number;
  topPerformer: TopSellingPackage | null;
  monthlyGrowth: string;
}

// --- GET TOP SELLING PACKAGES ---
export async function getTopSellingPackages(): Promise<{
  packages: TopSellingPackage[];
  stats: TopSellingStats;
}> {
  const supabase = createSimpleServerClient();

  try {
    // Get tour package sales data with product details
    const { data: salesData, error } = await supabase
      .from('tour_package_bookings')
      .select(`
        tour_product_id,
        grand_total,
        pax,
        status,
        created_at,
        tour_products (
          id,
          name,
          description
        )
      `)
      .not('tour_products', 'is', null) // Ensure tour_products is not null
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database Error fetching top selling packages:', error);
      return {
        packages: [],
        stats: {
          totalPackagesSold: 0,
          topPerformer: null,
          monthlyGrowth: "0%"
        }
      };
    }

    if (!salesData || salesData.length === 0) {
      console.log('No sales data found');
      return {
        packages: [],
        stats: {
          totalPackagesSold: 0,
          topPerformer: null,
          monthlyGrowth: "0%"
        }
      };
    }

    console.log('Raw sales data:', salesData.length, 'records');

    // Process the data to calculate sales by package
    const packageSales: Record<string, {
      id: string;
      name: string;
      sales: number;
      revenue: number;
      bookings: any[];
    }> = {};

    let totalBookings = 0;
    let totalRevenue = 0;

    salesData.forEach((booking: any) => {
      if (!booking.tour_products) {
        console.log('Skipping booking without tour_products:', booking.tour_product_id);
        return;
      }

      const productId = booking.tour_product_id;
      const productName = booking.tour_products.name;
      const revenue = booking.grand_total || 0;
      const sales = booking.pax || 0;

      if (!packageSales[productId]) {
        packageSales[productId] = {
          id: productId,
          name: productName,
          sales: 0,
          revenue: 0,
          bookings: []
        };
      }

      packageSales[productId].sales += sales;
      packageSales[productId].revenue += revenue;
      packageSales[productId].bookings.push(booking);
      
      totalBookings += sales;
      totalRevenue += revenue;
    });

    console.log('Processed package sales:', Object.keys(packageSales).length, 'packages');
    console.log('Total bookings (PAX):', totalBookings);
    console.log('Total revenue:', totalRevenue);

    // Convert to array and sort by revenue instead of sales volume
    const sortedPackages = Object.values(packageSales)
      .sort((a, b) => b.revenue - a.revenue) // Sort by revenue instead of sales
      .slice(0, 5); // Get top 5

    console.log('Top selling packages by revenue:', sortedPackages.map(p => `${p.name}: ฿${p.revenue} (${p.sales} PAX)`));

    // Extract destination from product name (more accurate)
    const getDestination = (name: string): string => {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('bhutan')) return 'Bhutan';
      if (nameLower.includes('phuket')) return 'Phuket, Thailand';
      if (nameLower.includes('bangkok')) return 'Bangkok, Thailand';
      if (nameLower.includes('chiang mai')) return 'Chiang Mai, Thailand';
      if (nameLower.includes('krabi')) return 'Krabi, Thailand';
      if (nameLower.includes('samui')) return 'Koh Samui, Thailand';
      if (nameLower.includes('customized') || nameLower.includes('custom')) return 'Various Destinations';
      return 'Thailand'; // Default
    };

    // Transform to TopSellingPackage format
    const topPackages: TopSellingPackage[] = sortedPackages.map((pkg, index) => ({
      id: pkg.id,
      name: pkg.name,
      destination: getDestination(pkg.name),
      sales: pkg.sales,
      revenue: pkg.revenue,
      growth: "0%", // Set to 0% since we don't have historical data
      progressValue: Math.min(100, (pkg.revenue / (sortedPackages[0]?.revenue || 1)) * 100) // Progress based on revenue
    }));

    console.log('Final top packages:', topPackages);

    // Calculate stats
    const topPerformer = topPackages[0] || null;
    const monthlyGrowth = "0%"; // Set to 0% since we don't have historical data

    const stats: TopSellingStats = {
      totalPackagesSold: totalBookings,
      topPerformer,
      monthlyGrowth
    };

    console.log('Final stats:', stats);

    return {
      packages: topPackages,
      stats
    };

  } catch (error) {
    console.error('Error fetching top selling packages:', error);
    return {
      packages: [],
      stats: {
        totalPackagesSold: 0,
        topPerformer: null,
        monthlyGrowth: "0%"
      }
    };
  }
}

// --- CREATE ---
export async function createTourProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = createSimpleServerClient();

  // 1. Validate form data
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = TourProductSchema.omit({ id: true, created_at: true, updated_at: true }).safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validatedFields.data;

  // 2. Insert data into Supabase
  try {
    console.log('Attempting to insert tour product:', { name, description });
    const { data, error } = await supabase
      .from('tour_products')
      .insert([{ name, description }])
      .select('id') // Select the id to confirm insertion
      .single(); // Expect a single record back

    if (error) {
      console.error('Supabase Insert Error:', error);
      return { message: `Database Error: Failed to create tour product. ${error.message}` };
    }

    if (!data) {
      return { message: 'Database Error: Failed to create tour product (no data returned).' };
    }

    console.log('Tour product created successfully:', data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not create tour product.' };
  }

  // 3. Revalidate cache and redirect
  revalidatePath('/tour-products');
  // Redirect inside try...catch is problematic, handle state instead or redirect on success outside
  // redirect('/tour-products'); // Consider redirecting from the page component based on success state
  return { message: 'Successfully created tour product!' };
}

// --- UPDATE ---
export async function updateTourProduct(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  if (!id) return { message: 'Error: Missing product ID for update.' };

  const supabase = createSimpleServerClient();

  // 1. Validate form data
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = TourProductSchema.omit({ id: true, created_at: true, updated_at: true }).safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validatedFields.data;

  // 2. Update data in Supabase
  try {
    console.log(`Attempting to update tour product ${id}:`, { name, description });
    const { error } = await supabase
      .from('tour_products')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Supabase Update Error:', error);
      return { message: `Database Error: Failed to update tour product. ${error.message}` };
    }

    console.log(`Tour product ${id} updated successfully.`);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not update tour product.' };
  }

  // 3. Revalidate cache and potentially redirect
  revalidatePath('/tour-products');
  revalidatePath(`/tour-products/${id}/edit`); // Revalidate edit page if applicable
  // redirect('/tour-products');
  return { message: 'Successfully updated tour product!' };
}

// --- DELETE ---
export async function deleteTourProduct(id: string): Promise<FormState> {
  if (!id) return { message: 'Error: Missing product ID for deletion.' };

  const supabase = createSimpleServerClient();

  // Delete data from Supabase
  try {
    console.log(`Attempting to delete tour product ${id}`);
    const { error } = await supabase.from('tour_products').delete().eq('id', id);

    if (error) {
      console.error('Supabase Delete Error:', error);
      // Handle potential foreign key constraint errors if ON DELETE RESTRICT is used
      if (error.code === '23503') { // Foreign key violation
         return { message: 'Database Error: Cannot delete product as it is linked to existing bookings.' };
      }
      return { message: `Database Error: Failed to delete tour product. ${error.message}` };
    }

    console.log(`Tour product ${id} deleted successfully.`);

  } catch (error) {
    console.error('Unexpected Error:', error);
    return { message: 'Unexpected Error: Could not delete tour product.' };
  }

  // Revalidate cache
  revalidatePath('/tour-products');
  return { message: 'Successfully deleted tour product!' };
  // No redirect here, typically handled by the calling component
}

// --- READ (for Server Components/Actions) ---
export async function getTourProducts(): Promise<TourProduct[]> {
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tour_products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Database Error fetching tour products:', error);
    // Depending on usage, might return empty array or throw
    return []; 
  }
  return data || [];
}

export async function getTourProductById(id: string): Promise<TourProduct | null> {
  if (!id) return null;
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tour_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Database Error fetching tour product ${id}:`, error);
     // Handle 'PGRST116' resource not found specifically if needed
     if (error.code === 'PGRST116') { 
       return null; // Not found is not necessarily an error
     }
    // Depending on usage, might return null or throw for other errors
    return null;
  }

  return data;
} 