'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Eye, UploadCloud, X as XIcon, Loader2 } from "lucide-react";
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
  TourPackageBookingSchema,
  type TourPackageStatus,
  type PaymentRecord
} from '@/lib/types/tours'
import {
  createTourPackageBooking,
  updateTourPackageBooking,
  addPaymentRecord,
  createPaymentSlipSignedUrl
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
import type { BookingReference } from "@/app/bookings/actions";
import { createClient } from '@/lib/supabase/client';
import { Label } from "@/components/ui/label";

interface TourPackageBookingFormProps {
  initialBooking: TourPackageBooking | null
  products: TourProduct[] // List of available products
  bookingReferences: BookingReference[] // <-- Add prop for references
  payments?: PaymentRecord[] // <-- Add optional payments prop
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

export function TourPackageBookingForm({ initialBooking, products, bookingReferences, payments, onSuccess }: TourPackageBookingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!initialBooking?.id;
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isViewUrlLoading, startViewUrlTransition] = React.useTransition();

  const form = useForm<TourPackageBookingFormValues>({
    resolver: zodResolver(TourPackageBookingSchema),
    defaultValues: {
      customer_name: initialBooking?.customer_name ?? '',
      tour_product_id: initialBooking?.tour_product_id ?? undefined,
      price: initialBooking?.price ?? undefined,
      pax: initialBooking?.pax ?? 1,
      status: initialBooking?.status ?? 'Open',
      booking_date: initialBooking?.booking_date ? new Date(initialBooking.booking_date) : new Date(),
      travel_start_date: initialBooking?.travel_start_date ? new Date(initialBooking.travel_start_date) : undefined,
      travel_end_date: initialBooking?.travel_end_date ? new Date(initialBooking.travel_end_date) : undefined,
      notes: initialBooking?.notes ?? '',
      linked_booking_id: initialBooking?.linked_booking_id ?? null,
    },
  });

  // Watch price and pax fields for total calculation
  const watchedPrice = form.watch("price");
  const watchedPax = form.watch("pax");
  const watchedStatus = form.watch("status");

  // TEMPORARY LOGGING:
  React.useEffect(() => {
    console.log("Watched Status:", watchedStatus, ", Type:", typeof watchedStatus);
  }, [watchedStatus]);

  // Calculate total
  const total = React.useMemo(() => {
    const price = Number(watchedPrice);
    const pax = Number(watchedPax);
    if (!isNaN(price) && !isNaN(pax) && pax > 0 && price > 0) {
      return price * pax;
    }
    return null;
  }, [watchedPrice, watchedPax]);

  // Define payment statuses in component scope
  const paymentStatuses: TourPackageStatus[] = ['Paid (1st installment)', 'Paid (Full Payment)'];

  // Find payment records specifically for each status
  const firstInstallmentPayment = React.useMemo(() => {
    return payments?.find(p => p.status_at_payment === 'Paid (1st installment)');
  }, [payments]);

  const fullPaymentPayment = React.useMemo(() => {
    return payments?.find(p => p.status_at_payment === 'Paid (Full Payment)');
  }, [payments]);

  // Determine if payment exists for the *currently selected* status
  const paymentExistsForCurrentStatus = watchedStatus === 'Paid (1st installment)' 
                                        ? !!firstInstallmentPayment 
                                        : watchedStatus === 'Paid (Full Payment)' 
                                            ? !!fullPaymentPayment 
                                            : false;

  // Get the payment record for the current status
  const currentStatusPaymentRecord = watchedStatus === 'Paid (1st installment)' 
                                ? firstInstallmentPayment 
                                : watchedStatus === 'Paid (Full Payment)' 
                                    ? fullPaymentPayment 
                                    : null;

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation (optional: add more checks for size, type)
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size exceeds 5MB limit.");
        event.target.value = ''; // Clear the input
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload an image (JPG, PNG, GIF) or PDF.");
        event.target.value = ''; // Clear the input
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  // Client-side action handler using react-hook-form's handleSubmit
  const onSubmit = async (values: TourPackageBookingFormValues) => {
    setIsUploading(false); 
    let uploadedFilePath: string | null = null; // Reset uploaded path for this submission
    let fileToUpload: File | null = selectedFile; // Hold the selected file

    // Prepare FormData for the main booking update/create (WITHOUT payment slip path)
    const bookingFormData = new FormData();
    bookingFormData.append('customer_name', values.customer_name);
    if (values.tour_product_id) bookingFormData.append('tour_product_id', values.tour_product_id);
    if (values.price !== undefined && values.price !== null) bookingFormData.append('price', String(values.price));
    bookingFormData.append('pax', String(values.pax));
    bookingFormData.append('status', values.status);
    if (values.booking_date) bookingFormData.append('booking_date', format(values.booking_date, 'yyyy-MM-dd'));
    if (values.travel_start_date) bookingFormData.append('travel_start_date', format(values.travel_start_date, 'yyyy-MM-dd'));
    if (values.travel_end_date) bookingFormData.append('travel_end_date', format(values.travel_end_date, 'yyyy-MM-dd'));
    if (values.notes) bookingFormData.append('notes', values.notes);
    if (values.linked_booking_id && values.linked_booking_id !== " ") {
      bookingFormData.append('linked_booking_id', values.linked_booking_id);
    } else {
      bookingFormData.append('linked_booking_id', '');
    }

    // Determine the action and booking ID
    const bookingIdToUse = isEditing ? initialBooking.id : null;
    const boundUpdateAction = isEditing ? updateTourPackageBooking.bind(null, bookingIdToUse!) : null;
    const bookingActionToCall = boundUpdateAction ?? createTourPackageBooking;

    console.log('Submitting booking data:', Object.fromEntries(bookingFormData.entries()));

    try {
        // --- Step 1: Create or Update Booking --- 
        const bookingResult = await bookingActionToCall({ message: '', errors: {} }, bookingFormData);
        console.log('Booking action response:', bookingResult);

        if (bookingResult?.errors && Object.keys(bookingResult.errors).length > 0) {
            // Handle booking validation errors
            Object.entries(bookingResult.errors).forEach(([field, messages]) => {
                if (messages) { form.setError(field as keyof TourPackageBookingFormValues, { type: 'server', message: messages.join(', ') }); }
            });
            toast.error(bookingResult.message || 'Failed to save booking due to validation errors.');
            return; // Stop if booking update fails
        }
        if (!bookingResult?.message?.toLowerCase().includes('success')) {
            // Handle general booking update errors
            toast.error(bookingResult.message || `Failed to ${isEditing ? 'update' : 'create'} booking.`);
            return; // Stop if booking update fails
        }

        // --- Step 2: Upload File and Add Payment Record (if applicable) --- 
        const finalBookingId = isEditing ? bookingIdToUse : bookingResult.bookingId;

        if (fileToUpload && finalBookingId && paymentStatuses.includes(values.status)) {
            console.log(`[onSubmit] Attempting to upload file for booking ${finalBookingId}, status ${values.status}`);
            setIsUploading(true);
            uploadedFilePath = null; // Ensure path is null initially for this attempt
            const uniqueFileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            // Store path relative to the bucket root, without leading 'public/'
            const filePath = `${finalBookingId}/${uniqueFileName}`; 
            console.log(`[onSubmit] Uploading to path within bucket: ${filePath}`);

            try {
                // Upload to Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('payment-slips')
                  .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: true });
                
                // --- CRITICAL: Check upload error --- 
                if (uploadError) {
                    console.error('[onSubmit] Supabase Storage Upload Error:', uploadError);
                    throw new Error(`Storage Upload Failed: ${uploadError.message}`); // Throw specific error
                }
                // --- End Critical Check ---

                uploadedFilePath = uploadData?.path;
                console.log(`[onSubmit] File uploaded successfully, path: ${uploadedFilePath}`);

                if (!uploadedFilePath) {
                    // This case should ideally not happen if uploadError is null, but check anyway
                    console.error('[onSubmit] File path missing after successful upload!', uploadData);
                    throw new Error("File uploaded but path was not returned.");
                }

                // Add Payment Record to DB via Server Action ONLY IF UPLOAD SUCCEEDED
                console.log(`[onSubmit] Calling addPaymentRecord for booking ${finalBookingId}, status ${values.status}, path ${uploadedFilePath}`);
                const paymentResult = await addPaymentRecord(finalBookingId, values.status, uploadedFilePath);

                if (!paymentResult.success) {
                    console.error(`[onSubmit] addPaymentRecord failed: ${paymentResult.message}`);
                    // Attempt to delete the file we just uploaded if DB record failed
                    console.warn(`Failed to add payment record for ${uploadedFilePath}, attempting to remove from storage.`);
                    await supabase.storage.from('payment-slips').remove([uploadedFilePath]);
                    throw new Error(paymentResult.message); // Throw error to be caught below
                }

                toast.success("Payment slip uploaded and record added!");
                setSelectedFile(null); 
                 const fileInput = document.getElementById('payment_slip') as HTMLInputElement;
                 if (fileInput) fileInput.value = '';

            } catch (uploadOrRecordError: any) {
                // Use the improved logging from previous step
                console.error(
                    "Detailed upload/record error:", 
                    uploadOrRecordError?.stack || uploadOrRecordError?.message || JSON.stringify(uploadOrRecordError) || "Unknown error"
                );
                const errorMessage = uploadOrRecordError?.message || 'An unknown error occurred during file processing.';
                // Append info about booking success
                toast.error(`Payment Slip Error: ${errorMessage}. Booking update was successful, but payment processing failed.`);
                // Stop further success handling for the overall form
                 setIsUploading(false); // Ensure loading state is off
                 return; // Exit onSubmit
            } finally {
                setIsUploading(false);
            }
        }

        // --- Step 3: Final Success Handling --- 
        // This part is reached only if booking succeeded AND (no file needed OR file+payment record succeeded)
        toast.success(`Booking ${isEditing ? 'updated' : 'created'} successfully!`);
        if (!isEditing) {
            router.push('/tour-packages'); // Redirect on create
        } else {
            // Update successful - redirect back to listing page
            onSuccess?.(); 
            router.push('/tour-packages'); // <-- Redirect on update
            // router.refresh(); // No longer needed if redirecting
        }

    } catch (error) {
        // Catch errors from the initial booking action call
        console.error("Failed to submit booking form:", error);
        toast.error('An unexpected error occurred during the booking process.');
    }
  };

  // Handler for viewing an existing slip
  const handleViewExistingSlip = (slipPath: string | undefined) => {
    if (!slipPath) {
        toast.error("Payment slip path not found for this record.");
        return;
    }
    startViewUrlTransition(async () => {
        const result = await createPaymentSlipSignedUrl(slipPath);
        if (result.success && result.url) {
            window.open(result.url, '_blank', 'noopener,noreferrer');
        } else {
            toast.error(result.message || "Failed to get viewable link.");
        }
    });
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

            {/* Wrapper Div for Price, PAX, and Total */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:col-span-2"> 
                {/* Price */}
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price per PAX (Optional)</FormLabel>
                            <FormControl>
                                <div className="relative flex items-center">
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
                                        field.onChange(value === '' ? undefined : parseInt(value, 10)); 
                                    }}
                                 />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {/* Total Display (Read-only) */}
                <FormItem>
                    <FormLabel>Total</FormLabel>
                    <FormControl>
                        <Input 
                            readOnly 
                            disabled // Use disabled for styling consistency
                            value={total !== null ? formatCurrency(total) : '-'} 
                            className="disabled:cursor-default disabled:opacity-100" // Adjust disabled styles
                        />
                    </FormControl>
                    {/* No FormMessage needed for read-only field */}
                </FormItem>
            </div>

            {/* Wrapper for Status, Linked Ref, and Payment Slip Input */}
            {isEditing && (
                <div className="grid grid-cols-1 gap-y-4 md:col-span-2">
                    {/* Inner grid for Status and Linked Ref */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Status Select */}
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
                              >
                                <FormControl>
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

                        {/* Conditionally render Linked Booking Ref if status is NOT Open */}
                        {watchedStatus !== 'Open' && (
                          <FormField
                            control={form.control}
                            name="linked_booking_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Linked Booking Ref (Optional)</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value ?? undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select booking ref..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* Add explicit None option */}
                                    <SelectItem value=" ">
                                      -- None --
                                    </SelectItem>
                                    {bookingReferences.map((ref) => (
                                      <SelectItem key={ref.id} value={ref.id}>
                                        {ref.booking_reference || `ID: ${ref.id.substring(0,6)}...`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                    </div>

                    {/* Conditionally render Payment Slip Upload Area */}
                    {paymentStatuses.includes(watchedStatus) && (
                        <div className="space-y-4 pt-2 border-t border-dashed mt-2">
                            {/* Show this whole section ONLY if status requires payment */}
                            {watchedStatus === 'Paid (Full Payment)' && firstInstallmentPayment && (
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">1st Installment Slip Uploaded:</span>
                                    </p>
                                    <Button 
                                        type="button"
                                        variant="secondary" 
                                        size="sm"
                                        onClick={() => handleViewExistingSlip(firstInstallmentPayment.payment_slip_path)}
                                        disabled={isViewUrlLoading} 
                                        title="View 1st Installment Slip"
                                    >
                                        {isViewUrlLoading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Eye className="mr-2 h-4 w-4" />
                                        )}
                                        View 1st Slip
                                    </Button>
                                </div>
                            )}

                            {/* Handle Current Status Payment */} 
                            <div className="mt-2">
                                {/* If payment DOES NOT exist for current status, show UPLOAD */}
                                {!paymentExistsForCurrentStatus && (
                                    <>
                                        <Label htmlFor="payment_slip">Upload Slip for <span className='font-semibold'>{watchedStatus}</span> (Max 5MB)</Label>
                                        <div className="flex items-center gap-4 mt-1">
                                            <Input
                                                id="payment_slip"
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.gif,.pdf"
                                                onChange={handleFileChange}
                                                className="flex-grow"
                                                disabled={isUploading}
                                            />
                                            {isUploading && <UploadCloud className="h-5 w-5 animate-spin" />}
                                        </div>
                                        {selectedFile && (
                                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                            <span>Selected: {selectedFile.name}</span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700">
                                                <XIcon className="h-3 w-3 mr-1"/> Clear
                                            </Button>
                                        </div>
                                        )}
                                    </>
                                )}
                                {/* If payment DOES exist for current status, show VIEW */}
                                {paymentExistsForCurrentStatus && currentStatusPaymentRecord && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            <span className="text-green-600 font-medium">✅ Slip Uploaded</span> for "{watchedStatus}"
                                        </p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleViewExistingSlip(currentStatusPaymentRecord.payment_slip_path)}
                                            disabled={isViewUrlLoading}
                                            title={`View Slip for ${watchedStatus}`}
                                        >
                                            {isViewUrlLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Eye className="mr-2 h-4 w-4" />
                                            )}
                                            View Slip
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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