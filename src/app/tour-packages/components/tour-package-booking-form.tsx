'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  TourProduct,
  TourPackageBooking,
  TourPackageStatusEnum,
  TourPackageBookingSchema
} from '@/lib/types/tours'
import {
  createTourPackageBooking,
  updateTourPackageBooking,
} from '@/lib/actions/tour-package-bookings'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

interface TourPackageBookingFormProps {
  initialBooking: TourPackageBooking | null
  products: TourProduct[] // List of available products
  onSuccess?: () => void // Optional callback for successful submission
}

// Separate component for the submit button to use useFormStatus
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Booking' : 'Create Booking')}
    </Button>
  );
}

// Use the Zod schema for validation
type TourPackageBookingFormValues = z.infer<typeof TourPackageBookingSchema>;

// Helper for currency formatting
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return ''; // Or return a placeholder like '-'
  }
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
};

export function TourPackageBookingForm({ initialBooking, products, onSuccess }: TourPackageBookingFormProps) {
  const router = useRouter();
  const isEditing = !!initialBooking?.id;

  const form = useForm<TourPackageBookingFormValues>({
    resolver: zodResolver(TourPackageBookingSchema),
    defaultValues: {
      customer_name: initialBooking?.customer_name ?? '',
      tour_product_id: initialBooking?.tour_product_id ?? undefined,
      price: initialBooking?.price ?? undefined,
      // Default PAX to 1
      pax: initialBooking?.pax ?? 1,
      status: initialBooking?.status ?? 'Open', // Default status to 'Open'
      // Default booking_date to today for new bookings
      booking_date: initialBooking?.booking_date ? new Date(initialBooking.booking_date) : new Date(),
      travel_start_date: initialBooking?.travel_start_date ? new Date(initialBooking.travel_start_date) : undefined,
      travel_end_date: initialBooking?.travel_end_date ? new Date(initialBooking.travel_end_date) : undefined,
      notes: initialBooking?.notes ?? '',
    },
  });

  // Watch price and pax fields for total calculation
  const watchedPrice = form.watch("price");
  const watchedPax = form.watch("pax");

  // Calculate total
  const total = React.useMemo(() => {
    const price = Number(watchedPrice);
    const pax = Number(watchedPax);
    if (!isNaN(price) && !isNaN(pax) && pax > 0 && price > 0) {
      return price * pax;
    }
    return null;
  }, [watchedPrice, watchedPax]);

  // Client-side action handler using react-hook-form's handleSubmit
  const onSubmit = async (values: TourPackageBookingFormValues) => {
    const formData = new FormData();

    // Append data matching the Zod schema and expected by the server action
    formData.append('customer_name', values.customer_name);
    if (values.tour_product_id) formData.append('tour_product_id', values.tour_product_id);
    if (values.price !== undefined && values.price !== null) formData.append('price', String(values.price));
    // Add PAX to formData
    formData.append('pax', String(values.pax));
    formData.append('status', values.status);
    if (values.booking_date) formData.append('booking_date', format(values.booking_date, 'yyyy-MM-dd'));
    if (values.travel_start_date) formData.append('travel_start_date', format(values.travel_start_date, 'yyyy-MM-dd'));
    if (values.travel_end_date) formData.append('travel_end_date', format(values.travel_end_date, 'yyyy-MM-dd'));
    if (values.notes) formData.append('notes', values.notes);

    const boundUpdateAction = isEditing ? updateTourPackageBooking.bind(null, initialBooking.id) : null;
    const actionToCall = boundUpdateAction ?? createTourPackageBooking;

    // Log the data being sent
    console.log('Submitting booking with data:', Object.fromEntries(formData.entries()));

    try {
      const result = await actionToCall({ message: '', errors: {} }, formData);

      // Log the response received
      console.log('Server response:', result);

      // Check specifically for the presence of errors
      if (result?.errors) {
        // Handle server-side validation errors (display them)
        console.error("Server validation errors:", result.errors);
        // Optionally set form errors using form.setError
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (messages) {
            form.setError(field as keyof TourPackageBookingFormValues, {
              type: 'server',
              message: messages.join(', '),
            });
          }
        });
        // Use the specific validation failure message if available, otherwise a generic one
        toast.error(result.message || 'Failed to save booking due to validation errors.');
      } 
      // Check for a general error message *if* there are no specific field errors
      else if (result?.message && !Object.keys(result.errors || {}).length) {
          // Check if the message indicates success (customize this check if needed)
          if (result.message.toLowerCase().includes('success')) {
             // --- Success Handling --- 
             if (!isEditing) {
                 // Create Success: Show success message and redirect
                 toast.success('Booking Created Successfully!'); 
                 console.log("Redirecting to /tour-packages");
                 router.push('/tour-packages'); 
             } else {
                 // Update Success: Show toast AND redirect
                 toast.success(`Tour Booking updated successfully!`);
                 console.log("Redirecting to /tour-packages after update");
                 router.push('/tour-packages'); // Redirect after update
                 // onSuccess?.(); // Keep or remove based on whether other actions needed
             }
          } else {
             // Assume other messages are errors if not explicitly success
             toast.error(result.message); 
          }
      } else {
         // Fallback for unexpected scenarios or if result is null/undefined 
         // (though the try/catch should handle most errors)
         if (!isEditing) {
             // Assume success if no errors and no message, proceed with redirect
             toast.success('Booking Created Successfully!');
             console.log("Redirecting to /tour-packages (fallback)");
             router.push('/tour-packages');
         } else {
             toast.success('Tour Booking updated successfully! (fallback)');
             onSuccess?.();
         }
      }
    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit' : 'Create New'} Tour Booking</CardTitle>
            <CardDescription>
              {isEditing ? 'Update the details of the tour booking.' : 'Enter the details for the new tour booking.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tour Product Select */}
            <FormField
              control={form.control}
              name="tour_product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Package</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    name={field.name}
                    disabled={products.length === 0}
                    required
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tour package..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No packages available
                        </div>
                      ) : (
                        products.map(product => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes (Moved Up) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 3* hotels, with single room booking"
                      rows={4}
                      {...field}
                      value={field.value ?? ''} 
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Wrapper Div for Price and PAX */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:col-span-2">
                {/* Price */}
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price per PAX (Optional)</FormLabel>
                            <FormControl>
                                <div className="relative flex items-center">
                                    {/* <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> */}
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 1250.99"
                                        className="pl-3 pr-12" 
                                        value={field.value ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === '' ? undefined : parseFloat(value));
                                        }}
                                     />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">THB</span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* PAX Field */}
                <FormField
                    control={form.control}
                    name="pax"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>PAX</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1" 
                                    placeholder="e.g., 2"
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Ensure integer conversion
                                        field.onChange(value === '' ? undefined : parseInt(value, 10)); 
                                    }}
                                 />
                            </FormControl>
                            <FormMessage />
                            {/* Display Total */}
                            {total !== null && (
                                <p className="text-sm font-medium text-muted-foreground pt-1">
                                    Total: {formatCurrency(total)}
                                </p>
                            )}
                        </FormItem>
                    )}
                />
            </div>

            {/* Status Select (Only show on Edit) */}
            {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        name={field.name}
                        required
                        // No longer need disabled prop, as the field is hidden on create
                        // disabled={!isEditing}
                      >
                        <FormControl>
                          {/* Remove class names related to disabled state */}
                          <SelectTrigger>
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TourPackageStatusEnum.options.map((statusValue) => (
                            <SelectItem key={statusValue} value={statusValue}>{statusValue}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

            {/* Wrapper Div for Start and End Dates */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:col-span-2">
                {/* Travel Start Date Picker */}
                <FormField
                    control={form.control}
                    name="travel_start_date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Travel Start Date (Optional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ?? undefined}
                                        onSelect={(date) => field.onChange(date)}
                                        disabled={(date) => {
                                            const isBeforeToday = date < new Date(new Date().setHours(0, 0, 0, 0));
                                            const endDate = form.getValues("travel_end_date");
                                            const isAfterEndDate = !!endDate && date > endDate;
                                            return isBeforeToday || isAfterEndDate;
                                           }
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Travel End Date Picker */}
                <FormField
                    control={form.control}
                    name="travel_end_date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Travel End Date (Optional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ?? undefined}
                                        onSelect={(date) => field.onChange(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

          </CardContent>
          <CardFooter className="flex justify-end">
            <SubmitButton isEditing={isEditing} />
          </CardFooter>
        </Card>
      </form>

    </Form>
  );
} 