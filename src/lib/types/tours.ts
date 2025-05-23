import { z } from 'zod';

// Database types (matching Supabase schema)
export interface TourProduct {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export const TourPackageStatusEnum = z.enum([
  'Open', 
  'Negotiating', 
  'Paid (1st installment)', 
  'Paid (Full Payment)', 
  'Complete', 
  'Closed'
]);

export type TourPackageStatus = z.infer<typeof TourPackageStatusEnum>;

export interface TourPackageBooking {
  id: string;
  tour_product_id: string;
  customer_name: string;
  base_price_per_pax?: number | null;
  booking_date?: string | null; // Assuming date only
  travel_start_date?: string | null; // Assuming date only
  travel_end_date?: string | null; // Assuming date only
  status: TourPackageStatus;
  notes?: string | null;
  linked_booking_id?: string | null;
  payment_slip_path?: string | null;
  created_at: string;
  updated_at: string;
  pax: number;
  addons?: Array<{ id: string; name: string; amount: number }> | null;
  total_per_pax?: number | null;
  grand_total?: number | null;
  // Optional: Add joined tour product data if needed frequently
  // tour_products?: Pick<TourProduct, 'name'> | null; 
}

// Zod Schemas for Validation
export const TourProductSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation
  name: z.string().min(3, { message: 'Product name must be at least 3 characters long.' }),
  description: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Base schema for booking data - used for omitting fields before refinement
const TourPackageBookingBaseSchema = z.object({
  id: z.string().length(5, { message: "ID must be 5 characters long" }).regex(/^[a-zA-Z0-9]+$/, { message: "ID must be alphanumeric" }).optional(),
  tour_product_id: z.string().uuid({ message: 'Please select a valid tour product.' }),
  customer_name: z.string().min(2, { message: 'Customer name is required.' }),
  base_price_per_pax: z.coerce.number().positive({ message: 'Base Price must be a positive number.' }).optional().nullable(),
  pax: z.coerce.number().int().positive({ message: 'PAX must be a positive number.' }).optional().nullable(),
  booking_date: z.coerce.date().optional().nullable(),
  travel_start_date: z.coerce.date().optional().nullable(),
  travel_end_date: z.coerce.date().optional().nullable(),
  status: TourPackageStatusEnum,
  notes: z.string().optional().nullable(),
  linked_booking_id: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Schema used for form validation (omits DB-generated fields first, then refines)
export const TourPackageBookingFormSchema = TourPackageBookingBaseSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .refine(data => {
    // Optional: Add refinement for date logic if needed, e.g., end date after start date
    if (data.travel_start_date && data.travel_end_date) {
      return data.travel_end_date >= data.travel_start_date;
    }
    return true;
  }, {
    message: 'Travel end date must be on or after the start date.',
    path: ['travel_end_date'], // Point error to the end date field
  });

// Base schema for Tour Package Booking
// Apply omit before refine
export const TourPackageBookingSchema = z.object({
    id: z.string().length(5, { message: "ID must be 5 characters long" }).regex(/^[a-zA-Z0-9]+$/, { message: "ID must be alphanumeric" }).optional(),
    customer_name: z.string().min(1, { message: 'Customer name is required.' }),
    tour_product_id: z.string().uuid({ message: 'Please select a valid tour package.' }),
    base_price_per_pax: z.coerce.number().positive('Base Price must be a positive number.').optional().nullable(),
    pax: z.coerce.number().int().positive('PAX must be a positive number.'),
    status: TourPackageStatusEnum,
    booking_date: z.date().optional().nullable(),
    travel_start_date: z.date().optional().nullable(),
    travel_end_date: z.date().optional().nullable(),
    notes: z.string().optional().nullable(),
    linked_booking_id: z.string().uuid().optional().nullable(),
    addons: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1, 'Add-on name is required.'),
        amount: z.coerce.number().positive('Add-on amount must be positive.')
    })),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
})
.omit({ id: true, created_at: true, updated_at: true })
.refine(data => {
    // Ensure end date is after start date if both are provided
    if (data.travel_start_date && data.travel_end_date) {
      return data.travel_end_date >= data.travel_start_date;
    }
    return true;
  }, {
    message: "Travel end date must be on or after the start date.",
    path: ["travel_end_date"],
  });

// Simplified types for form state or specific use cases
export type CreateTourProduct = z.infer<typeof TourProductSchema>;
export type TourPackageBookingFormData = z.infer<typeof TourPackageBookingFormSchema>;
export type FullTourPackageBooking = z.infer<typeof TourPackageBookingSchema>;

// TypeScript interface for Tour Product
export interface TourProduct extends Omit<z.infer<typeof TourProductSchema>, 'description'> {
    description?: string | null; // Explicitly allow null
}

// TypeScript interface for Tour Package Booking
export interface TourPackageBooking extends Omit<z.infer<typeof TourPackageBookingSchema>, 'booking_date' | 'travel_start_date' | 'travel_end_date' | 'notes' | 'base_price_per_pax' | 'id' | 'addons'> {
    id: string;
    booking_date?: string | null;
    travel_start_date?: string | null;
    travel_end_date?: string | null;
    notes?: string | null;
    base_price_per_pax?: number | null;
    addons?: Array<{ id: string; name: string; amount: number }> | null;
    pax: number;
    linked_booking_id?: string | null;
    total_per_pax?: number | null;
    grand_total?: number | null;
}

// Interface for booking joined with product name
export interface TourPackageBookingWithProduct extends TourPackageBooking {
  tour_products: { name: string } | null;
  linked_booking_pnr?: string | null;
  linked_bookings?: LinkedBookingInfo[] | null;
}

// NEW: Interface for linked booking information
export interface LinkedBookingInfo {
  id: string; // booking_id (UUID)
  booking_reference: string | null;
  customer_name: string | null;
  earliest_travel_date: string | null;
  status: string | null;
  created_at: string;
}

// --- NEW: Payment Record Type ---
export interface PaymentRecord {
    id: string; // uuid
    tour_package_booking_id: string; // varchar(5)
    status_at_payment: TourPackageStatus; // Use the existing enum type
    payment_slip_path: string; // text (path in storage)
    uploaded_at: string; // timestamp with time zone
    // Verification Fields
    is_verified?: boolean | null;
    verified_amount?: number | null;
    verified_payment_date?: string | null; // Store as ISO string or Date object? Let's use string for now
    verified_origin_bank?: string | null;
    verified_dest_bank?: string | null;
    verification_error?: string | null;
    verified_at?: string | null; // <-- Add verified_at timestamp
}

// --- NEW: Payment Ledger Item Type ---
export interface PaymentLedgerItem extends PaymentRecord {
    customer_name: string | null;
    package_name: string | null;
    // Verification fields are now implicitly included by extending PaymentRecord
} 