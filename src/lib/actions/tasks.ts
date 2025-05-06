'use server';

import { z } from 'zod';
import { createSimpleServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TourPackageStatus } from '@/lib/types/tours'; // Added direct import

import {
  TaskStatusEnum,
  TaskSchema,
  type TaskStatus, // Import type
  type TaskFormData, // Import type
  type TaskWithBookingInfo, // Import type
  type LinkedTourBookingSelectItem // Import type
} from '@/lib/types/tasks'; // Adjusted import path

// Type for the action state returned by server actions
interface TaskActionState {
  message: string;
  taskId?: number; // Use number for the bigint ID
  errors?: Record<string, string[]>;
  fieldValues?: Partial<TaskFormData>; // Keep partial for potentially complex objects
}

// Define the TypeScript interface based on the DB schema
// REMOVED Types based on generated Supabase types as the file wasn't found
// import type { Database } from '@/lib/types/supabase';
// type DbTask = Database['public']['Tables']['tasks']['Row'];
// type DbTourBooking = Database['public']['Tables']['tour_package_bookings']['Row'];
// type DbTourProduct = Database['public']['Tables']['tour_products']['Row'];

// --- CREATE TASK --- (Initial version)
export async function createTask(
  prevState: TaskActionState | undefined, // For potential useFormState, though direct call is often simpler
  formData: FormData
): Promise<TaskActionState> {
  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());

  // Convert empty strings or specific values for optional fields to null
  const processedData = {
    ...rawFormData,
    due_date: rawFormData.due_date || null,
    linked_tour_booking_id: rawFormData.linked_tour_booking_id || null,
    status: rawFormData.status || 'Pending' // Ensure status has a default if missing from form
  };

  // 2. Validate form data
  const validatedFields = TaskSchema.extend({
      status: TaskStatusEnum // Ensure status is one of the enum values after potential defaulting
  }).safeParse(processedData);

  if (!validatedFields.success) {
    console.error('Task Validation Error:', validatedFields.error.flatten().fieldErrors);
    // Keep field values as strings for form repopulation
    const fieldValuesForRepopulation = {
        description: rawFormData.description as string | undefined,
        due_date: rawFormData.due_date as string | undefined, // Keep date as string
        status: rawFormData.status as TaskStatus | undefined,
        linked_tour_booking_id: rawFormData.linked_tour_booking_id as string | undefined
    }
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      // @ts-ignore - Allow string types for repopulation mismatch
      fieldValues: fieldValuesForRepopulation,
    };
  }

  // 3. Destructure validated data
  const { description, due_date, status, linked_tour_booking_id } = validatedFields.data;

  // 4. Prepare data for Supabase insertion (handle dates)
  const dataToInsert = {
    description,
    // Format Date object to ISO string YYYY-MM-DD or null
    due_date: due_date ? due_date.toISOString().split('T')[0] : null,
    status: status, // Status is now non-optional here
    // Ensure null is sent if booking ID is optional and not provided
    linked_tour_booking_id: linked_tour_booking_id ?? null,
  };

  // 5. Insert data into Supabase
  try {
    console.log('Attempting to insert task:', dataToInsert);
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert(dataToInsert)
      .select('id') // Select the new ID
      .single();

    if (error) {
      console.error('Supabase Task Insert Error:', error);
      return { message: `Database Error: Failed to create task. ${error.message}` };
    }

    if (!newTask) {
        console.error('Supabase did not return new task data after insert.');
        return { message: 'Database Error: Failed to get new task ID after creation.' };
    }

    console.log(`Task ${newTask.id} created successfully.`);
    revalidatePath('/tasks'); // Revalidate the main tasks list page
    return { message: `Successfully created task #${newTask.id}!`, taskId: newTask.id };

  } catch (error) {
    console.error('Unexpected Error creating task:', error);
    return { message: 'Unexpected Error: Could not create task.' };
  }
}

// --- GET TASKS --- (Get all tasks, sorted, with optional linked booking info)
export async function getTasks(options?: { 
    sortBy?: string;
    ascending?: boolean;
}): Promise<TaskWithBookingInfo[]> {
  const supabase = createSimpleServerClient();
  const { sortBy = 'due_date', ascending = true } = options || {};

  // Select task fields and join with tour bookings and products
  const query = supabase
    .from('tasks')
    .select(`
      *,
      tour_package_bookings (
        customer_name,
        tour_products (
          name
        )
      )
    `)
    // Handle sorting - default sort by due date (nulls last), then created_at
    .order(sortBy === 'due_date' ? 'due_date' : 'created_at', { 
        ascending: sortBy === 'due_date' ? ascending : false, // Default sort due date asc, created_at desc
        nullsFirst: sortBy === 'due_date' ? false : true // Put tasks without due dates last
    })
    // Add secondary sort for consistency if primary is due date
    if (sortBy === 'due_date') {
        query.order('created_at', { ascending: false });
    }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase Error fetching tasks:', error);
    return []; // Return empty array on error
  }

  return (data as TaskWithBookingInfo[]) || []; // Type assertion
}

// --- GET TASK BY ID --- (Fetch a single task for editing)
export async function getTaskById(id: number): Promise<TaskWithBookingInfo | null> {
  if (!id) return null;
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      tour_package_bookings (
        customer_name,
        tour_products (
          name
        )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Supabase Error fetching task ${id}:`, error);
    return null;
  }
  return data as TaskWithBookingInfo | null; // Added type assertion
}

// --- UPDATE TASK --- 
export async function updateTask(
  taskId: number,
  formData: FormData
): Promise<TaskActionState> {
  if (!taskId) {
    return { message: 'Error: Missing Task ID for update.' };
  }
  const supabase = createSimpleServerClient();

  // 1. Prepare data for validation
  const rawFormData = Object.fromEntries(formData.entries());
  const processedData = {
    ...rawFormData,
    due_date: rawFormData.due_date || null,
    linked_tour_booking_id: rawFormData.linked_tour_booking_id || null,
    status: rawFormData.status // Status should be provided by the form for updates
  };

  // 2. Validate form data
  const validatedFields = TaskSchema.extend({
      status: TaskStatusEnum // Status is required for update
  }).safeParse(processedData);

  if (!validatedFields.success) {
    console.error('Task Update Validation Error:', validatedFields.error.flatten().fieldErrors);
     const fieldValuesForRepopulation = {
        description: rawFormData.description as string | undefined,
        due_date: rawFormData.due_date as string | undefined,
        status: rawFormData.status as TaskStatus | undefined,
        linked_tour_booking_id: rawFormData.linked_tour_booking_id as string | undefined
    }
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      // @ts-ignore
      fieldValues: fieldValuesForRepopulation,
    };
  }

  // 3. Destructure validated data
  const { description, due_date, status, linked_tour_booking_id } = validatedFields.data;

  // 4. Prepare data for Supabase update
  const dataToUpdate = {
    description,
    due_date: due_date ? due_date.toISOString().split('T')[0] : null,
    status,
    linked_tour_booking_id: linked_tour_booking_id ?? null,
    updated_at: new Date().toISOString(), // Manually set updated_at, though trigger should handle it
  };

  // 5. Update data in Supabase
  try {
    console.log(`Attempting to update task ${taskId}:`, dataToUpdate);
    const { error } = await supabase
      .from('tasks')
      .update(dataToUpdate)
      .eq('id', taskId);

    if (error) {
      console.error('Supabase Task Update Error:', error);
      return { message: `Database Error: Failed to update task. ${error.message}` };
    }

    console.log(`Task ${taskId} updated successfully.`);
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}/edit`);
    return { message: 'Successfully updated task!' };

  } catch (error) {
    console.error(`Unexpected Error updating task ${taskId}:`, error);
    return { message: 'Unexpected Error: Could not update task.' };
  }
}

// --- DELETE TASK ---
export async function deleteTask(taskId: number): Promise<{ message: string }> {
  if (!taskId) {
    return { message: "Error: Missing Task ID for deletion." };
  }

  const supabase = createSimpleServerClient();

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error("Supabase Delete Task Error:", error);
      return { message: `Database Error: Failed to delete task. ${error.message}` };
    }

    console.log(`Task ${taskId} deleted successfully.`);
    revalidatePath('/tasks');
    return { message: "Success: Task deleted." };
    
  } catch (error) {
    console.error(`Unexpected Delete Task Error for ${taskId}:`, error);
    return { message: "Unexpected Error: Could not delete task." };
  }
}

// --- GET TOUR BOOKINGS FOR LINKING (Paginated) ---
export async function getPaginatedTourBookingsForLinking(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string | null
): Promise<{ bookings: LinkedTourBookingSelectItem[]; totalCount: number; error?: string }> {
  const supabase = createSimpleServerClient();
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('tour_package_bookings')
      .select(`
        id,
        customer_name,
        status,
        created_at,
        tour_products ( name )
      `, { count: 'exact' }) // Get total count for pagination
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    // Apply search filter if searchTerm is provided
    if (searchTerm) {
      // Search across customer name and booking ID (adjust as needed)
      query = query.or(`customer_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase Error fetching tour bookings for linking:', error);
      return { bookings: [], totalCount: 0, error: `Database error: ${error.message}` };
    }

    // Map the data to the expected structure
    const formattedBookings: LinkedTourBookingSelectItem[] = data.map((item: any) => ({
      id: item.id,
      customer_name: item.customer_name,
      package_name: item.tour_products?.name ?? null, // Safely access nested product name
      status: item.status as TourPackageStatus | null, // Cast status
      created_at: item.created_at, // Keep as ISO string
    }));

    return {
      bookings: formattedBookings,
      totalCount: count ?? 0,
    };

  } catch (err: any) {
    console.error('Unexpected error fetching paginated tour bookings:', err);
    return { bookings: [], totalCount: 0, error: `Unexpected error: ${err.message}` };
  }
} 