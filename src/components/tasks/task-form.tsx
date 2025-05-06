'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, LinkIcon, Loader2, XCircleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTask, updateTask } from '@/lib/actions/tasks';
import {
  TaskSchema,
  TaskFormData,
  TaskStatusEnum,
  TaskStatus,
  LinkedTourBookingSelectItem,
  TaskWithBookingInfo
} from '@/lib/types/tasks';
import { LinkedTourBookingSelector } from "@/components/tasks/linked-tour-booking-selector";

// Define DbTask using Record<string, any> as a placeholder since Supabase types aren't reliably available
// type DbTask = Record<string, any>; // No longer needed for initialTask if using TaskWithBookingInfo

interface TaskFormProps {
  initialTask: TaskWithBookingInfo | null; // Changed to use TaskWithBookingInfo
}

// Submit button using useFormStatus
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? (isEditing ? 'Updating Task...' : 'Creating Task...') : (isEditing ? 'Update Task' : 'Create Task')}
    </Button>
  );
}

export function TaskForm({ initialTask }: TaskFormProps) {
  const router = useRouter();
  const isEditing = !!initialTask?.id;

  // State for the linked booking modal
  const [isBookingSelectorOpen, setIsBookingSelectorOpen] = React.useState(false);
  // State to display selected booking info (optional, could just use form value)
  const [selectedBookingDisplay, setSelectedBookingDisplay] = React.useState<string | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(TaskSchema),
    defaultValues: {
      description: initialTask?.description ?? '',
      due_date: initialTask?.due_date ? new Date(initialTask.due_date + 'T00:00:00') : undefined,
      status: (initialTask?.status as TaskStatus) ?? TaskStatusEnum.Enum.Pending,
      linked_tour_booking_id: initialTask?.linked_tour_booking_id ?? null,
    },
  });

  // Effect to set initial display for linked booking if editing
  React.useEffect(() => {
    if (isEditing && initialTask?.linked_tour_booking_id) {
      const customerName = initialTask.tour_package_bookings?.customer_name;
      const packageName = initialTask.tour_package_bookings?.tour_products?.name;
      if (customerName) {
        setSelectedBookingDisplay(`${customerName}${packageName ? ` (${packageName})` : ' (Package details unavailable)'}`);
      } else {
        // Fallback if customer name is not available but ID is
        setSelectedBookingDisplay(`ID: ${initialTask.linked_tour_booking_id} (Details unavailable)`);
      }
    } else {
      setSelectedBookingDisplay(null);
    }
  }, [initialTask, isEditing]);


  const onSubmit = async (values: TaskFormData) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'due_date' && value instanceof Date) {
        formData.append(key, format(value, 'yyyy-MM-dd'));
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString().split('T')[0]);
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      } else if (key === 'linked_tour_booking_id' && value === null) {
        formData.append(key, '');
      }
    });

    let result;
    try {
      if (isEditing && initialTask?.id) {
        result = await updateTask(initialTask.id, formData);
      } else {
        result = await createTask(undefined, formData); // Pass undefined for prevState if not using useFormState
      }

      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        // Redirect to tasks list or the edited task page
        router.push('/tasks');
        router.refresh(); // Optional: ensure data freshness if staying
      } else {
        // Handle validation errors or other server errors
        let errorMessage = result.message;
        if (result.errors) {
           Object.entries(result.errors).forEach(([field, messages]) => {
               if (messages) {
                   form.setError(field as keyof TaskFormData, { type: 'server', message: messages.join(', ') });
               }
           });
           errorMessage = "Validation failed. Please check the fields."; // More generic message
        }
        toast.error(errorMessage);
         // Repopulate form on server error if values provided (mainly for create)
        if (!isEditing && result.fieldValues) {
             Object.entries(result.fieldValues).forEach(([key, val]) => {
                 if (val !== undefined) {
                     // Need careful type handling here if repopulating complex fields
                     form.setValue(key as keyof TaskFormData, val as any);
                 }
             });
        }
      }
    } catch (error) {
      console.error("Task form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const handleSelectBooking = (booking: LinkedTourBookingSelectItem | null) => {
    if (booking) {
        form.setValue('linked_tour_booking_id', booking.id, { shouldValidate: true, shouldDirty: true });
        setSelectedBookingDisplay(`${booking.customer_name || 'Customer N/A'} (${booking.package_name || 'Package N/A'})`);
    } else {
        // Handle clearing the selection
        form.setValue('linked_tour_booking_id', null, { shouldValidate: true, shouldDirty: true });
        setSelectedBookingDisplay(null);
    }
    setIsBookingSelectorOpen(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</CardTitle>
              <CardDescription>
                {isEditing ? 'Update the details of the task.' : 'Enter the details for the new task.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter task description..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={(date) => field.onChange(date || null)} // Ensure null is passed if date is cleared
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} name={field.name}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TaskStatusEnum.options.map((statusValue) => (
                            <SelectItem key={statusValue} value={statusValue}>{statusValue}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Linked Tour Booking */}
              <FormField
                  control={form.control}
                  name="linked_tour_booking_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Tour Booking (Optional)</FormLabel>
                      <div className="flex items-center gap-2 mt-1">
                          {field.value ? (
                            <div className="flex-grow p-2 border rounded-md bg-muted/50 text-sm flex justify-between items-center min-h-[38px]">
                              <Link href={`/tour-packages/${field.value}`} className="hover:underline">
                                {selectedBookingDisplay || `ID: ${field.value}`}
                              </Link>
                              <Button variant="ghost" size="icon" onClick={() => handleSelectBooking(null)} className="h-6 w-6">
                                  <XCircleIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          ) : (
                              <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsBookingSelectorOpen(true)}
                                  className="w-full md:w-auto"
                              >
                                  <LinkIcon className="mr-2 h-4 w-4" /> Select Tour Booking
                              </Button>
                          )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <SubmitButton isEditing={isEditing} />
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* Modal for selecting tour booking */}
      <LinkedTourBookingSelector
          isOpen={isBookingSelectorOpen}
          onClose={() => setIsBookingSelectorOpen(false)}
          onSelectBooking={handleSelectBooking} // Handles both select and clear (null)
          currentLinkedBookingId={form.getValues("linked_tour_booking_id") ?? null}
      />
    </>
  );
} 