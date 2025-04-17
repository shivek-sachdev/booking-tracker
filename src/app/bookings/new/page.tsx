import React from 'react';
import { createSimpleServerClient } from "@/lib/supabase/server";
import type { Customer, PredefinedSector } from "@/types/database";
import { BookingForm } from "@/components/bookings/booking-form";

export default async function NewBookingPage() {
  const supabase = createSimpleServerClient();

  // Fetch necessary data for dropdowns
  const [customersResult, sectorsResult] = await Promise.all([
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
      .returns<PredefinedSector[]>()
  ]);

  const customers = customersResult.data ?? [];
  const predefinedSectors = sectorsResult.data ?? [];
  const error = customersResult.error || sectorsResult.error;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Add New Booking</h1>
      
      {error && (
          <p className="text-red-500 mb-4">Error loading form data: {error.message}</p>
      )}

      {/* Render the form component, passing fetched data and mode */}
      {!error && (
          <BookingForm 
              mode="add"
              customers={customers} 
              predefinedSectors={predefinedSectors} 
            />
      )}
    </div>
  );
} 