import { z } from 'zod';
import type { BookingType, BookingStatus } from '@/types/database';

// Zod schema for validating customer form data
export const customerSchema = z.object({
  company_name: z.string().min(1, { message: 'Company name is required' }).max(255),
});

// Zod schema for validating predefined sector form data
export const predefinedSectorSchema = z.object({
    origin_code: z.string().min(3, { message: 'Origin code must be at least 3 characters' }).max(10).toUpperCase(),
    destination_code: z.string().min(3, { message: 'Destination code must be at least 3 characters' }).max(10).toUpperCase(),
    description: z.string().max(255).optional().nullable(), // Optional description
});

// Updated Zod schema for a single booking sector within the form
const bookingSectorFormSchema = z.object({
    predefined_sector_id: z.string().uuid({ message: "Please select a valid sector."}),
    travel_date: z.date({
        invalid_type_error: "That's not a valid date!",
    }).optional().nullable(),
    flight_number: z.string().max(20).optional().nullable(),
    status: z.enum(['Confirmed', 'Waiting List'] as [BookingStatus, ...BookingStatus[]], {
        required_error: "Sector status is required.",
    }),
    // Passenger count must be at least 1
    num_pax: z.coerce.number().int({ message: "Must be a whole number." }).min(1, { message: "At least 1 passenger required." }).max(999, { message: "Maximum 999 passengers." }),
});

// Updated Zod schema for the main booking form
export const bookingFormSchema = z.object({
    // Booking Details section
    customer_id: z.string().uuid({ message: "Please select a valid customer."}),
    booking_type: z.enum(['One-Way', 'Return'] as [BookingType, ...BookingType[]], {
        required_error: "Booking type is required.",
    }),
    // Sectors section (array)
    sectors: z.array(bookingSectorFormSchema).min(1, { message: "At least one sector is required."}),
    // Booking Reference section
    booking_reference: z.string().min(1, { message: "Booking reference is required."}).max(50),
    deadline: z.date().optional().nullable(),
}).refine(data => {
    if (data.booking_type === 'One-Way') {
      return data.sectors.length === 1;
    }
    return true;
}, {
    message: "One-Way bookings must have exactly one sector.",
    path: ["sectors"],
}).refine(data => {
     if (data.booking_type === 'Return') {
      return data.sectors.length === 2;
    }
    return true;
}, {
    message: "Return bookings must have exactly two sectors.",
    path: ["sectors"],
});

// Type for form inference
export type BookingFormData = z.infer<typeof bookingFormSchema>;

// Add other schemas here as needed 