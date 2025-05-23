import React from 'react';
import { createSimpleServerClient } from "@/lib/supabase/server";
import type { Customer, PredefinedSector, FareClass } from "@/types/database";
import { BookingForm } from "@/components/bookings/booking-form";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Ensure this page is always dynamically rendered to fetch latest data
export const dynamic = 'force-dynamic';

export default async function NewBookingPage() {
  const supabase = createSimpleServerClient();

  // Fetch necessary data, including fare classes
  const [customersResult, sectorsResult, fareClassesResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, company_name')
      .order('company_name', { ascending: true })
      .returns<Customer[]>(),
    supabase
      .from('predefined_sectors')
      .select('id, origin_code, destination_code, description')
      .order('origin_code', { ascending: true })
      .order('destination_code', { ascending: true })
      .returns<PredefinedSector[]>(),
    supabase
      .from('fare_classes')
      .select('id, name')
      .order('name', { ascending: true })
      .returns<FareClass[]>()
  ]);

  const customers = customersResult.data ?? [];
  const predefinedSectors = sectorsResult.data ?? [];
  const fareClasses = fareClassesResult.data ?? [];
  const error = customersResult.error || sectorsResult.error || fareClassesResult.error;

  // Check if we have any customers
  const hasCustomers = customers.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Add New Booking</h1>
      
      {error && (
          <p className="text-red-500 mb-4">Error loading form data: {error.message}</p>
      )}

      {!error && !hasCustomers && (
        <div className="rounded-md border p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">No customers found</h2>
          <p className="mb-4">You need to add at least one customer before you can create a booking.</p>
          <Link href="/customers" passHref>
            <Button>Go to Customers Page</Button>
          </Link>
        </div>
      )}

      {/* Render the form component, passing fetched data and mode */}
      {!error && hasCustomers && (
          <BookingForm 
              mode="add"
              customers={customers} 
              predefinedSectors={predefinedSectors} 
              fareClasses={fareClasses}
            />
      )}
    </div>
  );
} 