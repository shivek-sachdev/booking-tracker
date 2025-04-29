import { z } from 'zod';
import type { BookingType, BookingStatus } from '@/types/database';

// Define and export the possible booking statuses including the new ones
export const bookingStatuses: [BookingStatus, ...BookingStatus[]] = [
 'Confirmed', 
 'Waiting List', 
 'Ticketed', 
 'Cancelled',
 'Pending', 
 'Unconfirmed'
];

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
export const bookingSectorFormSchema = z.object({
    predefined_sector_id: z.string().uuid({ message: "Please select a valid sector."}),
    travel_date: z.date({
        invalid_type_error: "That's not a valid date!",
    }).optional().nullable(),
    fare_class_id: z.string().uuid().optional().nullable(),
    flight_number: z.string().max(20).optional().nullable(),
    // Sector status only allows Confirmed or Waiting List
    status: z.enum(['Confirmed', 'Waiting List'] as [BookingStatus, ...BookingStatus[]], {
        required_error: "Sector status is required.",
    }),
    // Allow zero or negative passenger counts
    num_pax: z.coerce.number().int({ message: "Must be a whole number." }).max(999, { message: "Maximum 999 passengers." }),
});

// Updated Zod schema for the main booking form (NO main status field here)
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

// Schema specifically for the update action, including the main status field
export const updateBookingActionSchema = z.object({
  booking_reference: z.string().min(1, "Booking reference is required"),
  customer_id: z.string().uuid("Please select a valid customer"),
  status: z.enum(bookingStatuses, { // Allow setting any valid status on update
    required_error: "Booking status is required for update."
  }), 
  deadline: z.date().optional().nullable(),
  // Note: We are not validating/processing sectors within the basic update action currently
});

// Type for form inference
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type UpdateBookingActionData = z.infer<typeof updateBookingActionSchema>;

// Add Zod schema for fare class validation
export const fareClassSchema = z.object({
  name: z.string()
    .min(1, { message: "Fare class name is required." })
    .max(50, { message: "Name cannot exceed 50 characters." }),
  description: z.string()
    .max(255, { message: "Description cannot exceed 255 characters." })
    .optional()
    .nullable(),
});

export type FareClassFormData = z.infer<typeof fareClassSchema>;

// Add other schemas here as needed 