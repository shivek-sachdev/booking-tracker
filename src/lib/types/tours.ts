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
  price?: number | null;
  booking_date?: string | null; // Assuming date only
  travel_start_date?: string | null; // Assuming date only
  travel_end_date?: string | null; // Assuming date only
  status: TourPackageStatus;
  notes?: string | null;
  linked_booking_id?: string | null;
  created_at: string;
  updated_at: string;
  pax: number;
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
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }).optional().nullable(), // Use coerce for FormData string conversion
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
    price: z.coerce.number().positive('Price must be a positive number.').optional().nullable(),
    pax: z.coerce.number().int().positive('PAX must be a positive number.'),
    status: TourPackageStatusEnum,
    booking_date: z.date().optional().nullable(),
    travel_start_date: z.date().optional().nullable(),
    travel_end_date: z.date().optional().nullable(),
    notes: z.string().optional().nullable(),
    linked_booking_id: z.string().uuid().optional().nullable(),
    created_at: z.string().datetime().optional(), // Keep for type inference if needed
    updated_at: z.string().datetime().optional(), // Keep for type inference if needed
})
.omit({ id: true, created_at: true, updated_at: true }) // Omit fields not needed for create/update forms before refinement
.refine(data => {
    // Ensure end date is after start date if both are provided
    if (data.travel_start_date && data.travel_end_date) {
      return data.travel_end_date >= data.travel_start_date;
    }
    return true;
  }, {
    message: "Travel end date must be on or after the start date.",
    path: ["travel_end_date"], // Point error to the end date field
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
export interface TourPackageBooking extends Omit<z.infer<typeof TourPackageBookingSchema>, 'booking_date' | 'travel_start_date' | 'travel_end_date' | 'notes' | 'price' | 'id'> {
    id: string;
    // Represent dates as strings, matching potential DB representation or making them optional
    booking_date?: string | null;
    travel_start_date?: string | null;
    travel_end_date?: string | null;
    notes?: string | null; // Explicitly allow null
    price?: number | null; // Explicitly allow null for price
    pax: number;
    linked_booking_id?: string | null;
}

// Interface for booking joined with product name
export interface TourPackageBookingWithProduct extends TourPackageBooking {
  // Change back to array based on build error message
  tour_products: { name: string }[] | null;
} 