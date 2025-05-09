import { z } from 'zod';
import type { TourPackageStatus } from '@/lib/types/tours';

// Define allowed task statuses
export const TaskStatusEnum = z.enum(['Pending', 'In Progress', 'Completed']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

// Base Schema for Task Data (used for validation)
// ID is generated by DB, created_at/updated_at are handled by DB
export const TaskSchema = z.object({
  description: z.string().min(1, { message: "Description is required." }),
  due_date: z.coerce.date().nullable().optional(), // Coerce string/date to Date object
  status: TaskStatusEnum.optional(), // Make status optional in schema validation
  linked_tour_booking_id: z.string().length(5, { message: "Invalid Tour Booking ID format." }).nullable().optional(),
});

export type TaskFormData = z.infer<typeof TaskSchema>;

// Interface for Task with optional linked booking details
// TODO: Replace `any` with proper types if Supabase types are generated/located
export interface TaskWithBookingInfo extends Record<string, any> { // Using Record<string, any> temporarily
  id: number;
  description: string;
  due_date?: string | null;
  status: string; // This should align with TaskStatus, but raw from DB might be string
  linked_tour_booking_id?: string | null;
  created_at: string;
  updated_at: string;
  tour_package_bookings?: {
    customer_name: string | null;
    tour_products?: {
      name: string | null;
    } | null;
  } | null;
}

// Define the shape of the items needed for the selector modal
export interface LinkedTourBookingSelectItem {
  id: string; // Tour booking ID (varchar 5)
  customer_name: string | null;
  package_name: string | null; // From joined tour_products
  status: TourPackageStatus | null;
  created_at: string; // ISO date string
} 