'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Eye, UploadCloud, X as XIcon, Loader2, PlusCircle, Trash2, LinkIcon, XCircleIcon } from "lucide-react";
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
  TourPackageStatusEnum,
  TourPackageBookingSchema,
  type TourPackageStatus,
  type PaymentRecord,
  type TourPackageBooking as TourPackageBookingDbType
} from '@/lib/types/tours'
import {
  createTourPackageBooking,
  updateTourPackageBooking,
  addPaymentRecord,
  createPaymentSlipSignedUrl,
} from '@/lib/actions/tour-package-bookings'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { LinkedBookingSelectionModal } from "@/components/tour-packages/linked-booking-selection-modal";
import type { LinkedBookingSelectItem, getBookingReferenceById as fetchBookingRefById } from "@/app/bookings/actions";

interface TourPackageBookingFormProps {
  initialBooking: TourPackageBookingDbType | null
  products: TourProduct[]
  payments?: PaymentRecord[]
  onSuccess?: () => void
}

// Separate component for the submit button to use useFormStatus
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Booking' : 'Create Booking')}
    </Button>
  );
}

// Explicitly type the form values
type TourPackageBookingFormValues = z.infer<typeof TourPackageBookingSchema>;

// Helper for currency formatting
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-'; // Return a placeholder for invalid/null amounts
  }
  // Ensure we handle potential floating point inaccuracies for display
  const roundedAmount = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'THB', // Keep THB or make dynamic if needed
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
 }).format(roundedAmount);
};

export function TourPackageBookingForm({ initialBooking, products, payments, onSuccess }: TourPackageBookingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!initialBooking?.id;
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isViewUrlLoading, startViewUrlTransition] = React.useTransition();
  const [newAddon, setNewAddon] = React.useState({ name: '', amount: '' });

  const [isLinkedBookingModalOpen, setIsLinkedBookingModalOpen] = React.useState(false);
  const [selectedLinkedBookingRef, setSelectedLinkedBookingRef] = React.useState<string | null>(null);
  const [isFetchingInitialRef, setIsFetchingInitialRef] = React.useState(false);

  // useEffect to fetch PNR for initial linked booking
  React.useEffect(() => {
    const fetchInitialReference = async () => {
      if (initialBooking?.linked_booking_id) {
        setIsFetchingInitialRef(true);
        try {
          // Dynamically import the server action
          const { getBookingReferenceById } = await import('@/app/bookings/actions');
          const pnr = await getBookingReferenceById(initialBooking.linked_booking_id);
          setSelectedLinkedBookingRef(pnr); // Store PNR if fetched, or null if not found
        } catch (error) {
          console.error("Failed to fetch initial linked booking reference:", error);
          setSelectedLinkedBookingRef(null); // Fallback if fetch fails
        }
        setIsFetchingInitialRef(false);
      } else {
        setSelectedLinkedBookingRef(null); // Clear if no booking is linked initially
      }
    };

    if (isEditing) { // Only run for existing bookings
        fetchInitialReference();
    }
  }, [initialBooking?.linked_booking_id, isEditing]); // Depend on the ID and edit status

  const form = useForm<TourPackageBookingFormValues>({
    resolver: zodResolver(TourPackageBookingSchema),
    defaultValues: {
      customer_name: initialBooking?.customer_name ?? '',
      tour_product_id: initialBooking?.tour_product_id ?? (products.length > 0 ? products[0].id : ''),
      base_price_per_pax: initialBooking?.base_price_per_pax ?? undefined,
      pax: initialBooking?.pax ?? 1,
      status: initialBooking?.status ?? 'Open',
      booking_date: initialBooking?.booking_date ? new Date(initialBooking.booking_date) : new Date(),
      travel_start_date: initialBooking?.travel_start_date ? new Date(initialBooking.travel_start_date) : undefined,
      travel_end_date: initialBooking?.travel_end_date ? new Date(initialBooking.travel_end_date) : undefined,
      notes: initialBooking?.notes ?? '',
      linked_booking_id: initialBooking?.linked_booking_id ?? null,
      addons: initialBooking?.addons ?? [],
    },
  });

  const { fields: addonFields, append: appendAddon, remove: removeAddon } = useFieldArray({
    control: form.control,
    name: "addons",
  });

  const handleAddAddon = () => {
    const name = newAddon.name.trim();
    // Ensure amount is treated as number for validation
    const amountValue = newAddon.amount.trim();
    const amount = amountValue === '' ? NaN : parseFloat(amountValue);

    if (!name) {
      toast.error("Please enter an add-on item name.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
       toast.error("Please enter a valid positive amount for the add-on.");
       return;
    }

    appendAddon({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8), // Temporary ID
      name,
      amount
    });
    setNewAddon({ name: '', amount: '' }); // Reset input fields
  };

  const watchedBasePrice = form.watch("base_price_per_pax");
  const watchedPax = form.watch("pax");
  const watchedAddons = form.watch("addons");
  const watchedStatus = form.watch("status");
  const watchedLinkedBookingId = form.watch("linked_booking_id");

  const { totalPerPax, grandTotal } = React.useMemo(() => {
    const basePrice = Number(watchedBasePrice || 0);
    const pax = Number(watchedPax || 1);
    const addonsTotal = watchedAddons?.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0;
    let calculatedTotalPerPax = 0;
    if (!isNaN(basePrice) && basePrice >= 0) {
        calculatedTotalPerPax += basePrice;
    }
     if (!isNaN(addonsTotal) && addonsTotal > 0) {
         calculatedTotalPerPax += addonsTotal;
     }
    let calculatedGrandTotal = 0;
    if (calculatedTotalPerPax >= 0 && !isNaN(pax) && pax > 0) {
      calculatedGrandTotal = calculatedTotalPerPax * pax;
    }
    return {
        totalPerPax: isNaN(calculatedTotalPerPax) ? 0 : calculatedTotalPerPax,
        grandTotal: isNaN(calculatedGrandTotal) ? 0 : calculatedGrandTotal
    };
  }, [watchedBasePrice, watchedPax, watchedAddons]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size should not exceed 5MB.");
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Clear the input
        }
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const onSubmit = async (values: TourPackageBookingFormValues) => {
    setIsUploading(true);

    // Convert addons to string for FormData
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'addons') {
        formData.append(key, JSON.stringify(value ?? []));
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    // Ensure linked_booking_id is correctly handled if it's null or empty
    if (!values.linked_booking_id) {
        formData.set('linked_booking_id', ''); // Send empty string for server to convert to null
    }

    let bookingIdToUse = initialBooking?.id;
    let mainActionResult;

    try {
      if (isEditing && bookingIdToUse) {
        mainActionResult = await updateTourPackageBooking(bookingIdToUse, formData);
      } else {
        mainActionResult = await createTourPackageBooking(formData);
        if (mainActionResult.bookingId) {
          bookingIdToUse = mainActionResult.bookingId; // Get new booking ID
        }
      }

      if (mainActionResult.message.startsWith('Success') || mainActionResult.message.startsWith('Successfully')) {
        toast.success(mainActionResult.message);

        // Handle file upload if a file is selected and we have a booking ID
        if (selectedFile && bookingIdToUse) {
          toast.info("Uploading payment slip...");
          // Use Date.now() for uniqueness instead of uuidv4()
          const uniquePart = Date.now();
          const fileName = `${bookingIdToUse}/${uniquePart}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-slips')
            .upload(fileName, selectedFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            toast.error(`Payment slip upload failed: ${uploadError.message}`);
            // Continue even if slip upload fails, main booking data is saved.
          } else if (uploadData?.path) {
            const paymentResult = await addPaymentRecord(
              bookingIdToUse,
              values.status, // Current status from the form
              uploadData.path
            );

            if (paymentResult.success) {
              toast.success("Payment record added successfully.");
              setSelectedFile(null); // Clear selected file state
              if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Clear file input
              }
              router.refresh(); // Refresh to see if new payment affects displayed single payment
            } else {
              toast.error(`Failed to add payment record: ${paymentResult.message}`);
            }
          }
        } else if (selectedFile && !bookingIdToUse) {
            toast.error("Could not upload payment slip: Booking ID is missing.");
        }

        if (onSuccess) onSuccess();
        if (!isEditing && bookingIdToUse) {
          router.push(`/tour-packages/${bookingIdToUse}/edit`); // Navigate to edit page for new booking
        } else if (isEditing && bookingIdToUse) {
          router.push(`/tour-packages/${bookingIdToUse}`); // Navigate to detail page for updated booking
        } else {
          router.refresh(); // Fallback refresh if something unexpected happens
        }

      } else {
        // Display errors from Zod or server action
        let errorMessage = mainActionResult.message;
        if (mainActionResult.errors) {
            const fieldErrors = Object.values(mainActionResult.errors).flat().join(', ');
            errorMessage += `: ${fieldErrors}`;
        }
        toast.error(errorMessage);
        // Re-populate form fields if server provides them (e.g., after validation fail on create)
        if (mainActionResult.fieldValues) {
            Object.entries(mainActionResult.fieldValues).forEach(([key, val]) => {
                if (val !== undefined) {
                    form.setValue(key as keyof TourPackageBookingFormValues, val as any);
                }
            });
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectLinkedBooking = (booking: LinkedBookingSelectItem) => {
    form.setValue('linked_booking_id', booking.id, { shouldValidate: true, shouldDirty: true });
    setSelectedLinkedBookingRef(booking.booking_reference);
    setIsLinkedBookingModalOpen(false);
  };

  const handleClearLinkedBooking = () => {
    form.setValue('linked_booking_id', null, { shouldValidate: true, shouldDirty: true });
    setSelectedLinkedBookingRef(null);
    setIsLinkedBookingModalOpen(false);
  };
  
  const handleViewExistingSlip = async (slipPath: string | undefined) => {
    if (!slipPath) {
      toast.error("Slip path is missing.");
      return;
    }
    startViewUrlTransition(async () => {
      try {
        const result = await createPaymentSlipSignedUrl(slipPath);
        if (result.success && result.url) {
          window.open(result.url, '_blank');
        } else {
          toast.error(result.message || "Could not generate viewable link for the slip.");
        }
      } catch (error) {
        toast.error("Failed to generate slip URL.");
        console.error(error);
      }
    });
  };

  // Re-introduce logic for handling single payment slip based on status
  const paymentStatuses: TourPackageStatus[] = ['Paid (1st installment)', 'Paid (Full Payment)'];
  
  const firstInstallmentPayment = React.useMemo(() => {
    return payments?.find(p => p.status_at_payment === 'Paid (1st installment)');
  }, [payments]);

  const fullPaymentPayment = React.useMemo(() => {
    return payments?.find(p => p.status_at_payment === 'Paid (Full Payment)');
  }, [payments]);
  
  const paymentExistsForCurrentStatus = watchedStatus === 'Paid (1st installment)'
                                        ? !!firstInstallmentPayment
                                        : watchedStatus === 'Paid (Full Payment)'
                                            ? !!fullPaymentPayment
                                            : false;

  const currentStatusPaymentRecord = watchedStatus === 'Paid (1st installment)'
                                ? firstInstallmentPayment
                                : watchedStatus === 'Paid (Full Payment)'
                                    ? fullPaymentPayment
                                    : null;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit' : 'Create New'} Tour Booking</CardTitle>
              <CardDescription>
                {isEditing ? 'Update the details of the tour booking.' : 'Enter the details for the new tour booking.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
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
                          onSelect={field.onChange}
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
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={!form.watch("travel_start_date")}
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
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const startDate = form.watch("travel_start_date");
                            return !!startDate && date < startDate;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
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

              {/* Pricing Section (Base + Addons) */}
              <div className="md:col-span-2 space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium mb-2">Pricing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="base_price_per_pax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price per PAX (Optional)</FormLabel>
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
                                field.onChange(value === '' ? null : parseFloat(value));
                              }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">THB</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>
              </div>

              {/* Addons Section */}
              <div className="md:col-span-2 space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium mb-2">Additional Costs</h3>
                <div className="space-y-2">
                  {addonFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                      <FormField
                        control={form.control}
                        name={`addons.${index}.name`}
                        render={({ field: itemField }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Item name" {...itemField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`addons.${index}.amount`}
                        render={({ field: itemField }) => (
                          <FormItem className="w-32">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                {...itemField}
                                onChange={e => itemField.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAddon(index)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="new_addon_name" className="sr-only">New Add-on Name</Label>
                    <Input
                      id="new_addon_name"
                      placeholder="New item name"
                      value={newAddon.name}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="new_addon_amount" className="sr-only">New Add-on Amount</Label>
                    <Input
                      id="new_addon_amount"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={newAddon.amount}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddAddon}
                    aria-label="Add item"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Totals Section */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6 mt-4">
                <FormItem>
                  <FormLabel>Total per Person</FormLabel>
                  <Input
                    readOnly
                    disabled
                    value={formatCurrency(totalPerPax)}
                    className="disabled:cursor-default disabled:opacity-100 bg-muted/50 text-lg font-semibold"
                  />
                </FormItem>
                
                <div>
                  <Label className="text-lg font-semibold">Grand Total</Label>
                  <p className="text-3xl font-bold mt-2">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>

              {/* Other Fields (Status, Linked Booking) */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
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

                {watchedStatus !== 'Open' && (
                  <FormItem>
                    <FormLabel>Linked Ticket Booking</FormLabel>
                    <div className="flex items-center gap-2 mt-1">
                      {form.getValues("linked_booking_id") ? (
                        <div className="flex-grow p-2 border rounded-md bg-muted/50 dark:bg-slate-800/50 text-sm flex justify-between items-center min-h-[38px]">
                          {isFetchingInitialRef ? (
                            <span className="text-muted-foreground"><Loader2 className="inline-block mr-2 h-3 w-3 animate-spin" />Loading PNR...</span>
                          ) : selectedLinkedBookingRef ? (
                            <span>{selectedLinkedBookingRef}</span>
                          ) : form.getValues("linked_booking_id") ? (
                            <span>Ref ID: {form.getValues("linked_booking_id")!.substring(0, 8)}...</span>
                          ) : (
                            <span className="text-muted-foreground">Not Linked</span>
                          )}
                          <Button variant="ghost" size="icon" onClick={handleClearLinkedBooking} className="h-6 w-6" disabled={isFetchingInitialRef}>
                            <XCircleIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsLinkedBookingModalOpen(true)}
                          className="w-full"
                        >
                          <LinkIcon className="mr-2 h-4 w-4" /> Select Ticket Booking
                        </Button>
                      )}
                    </div>
                    <FormMessage>{form.formState.errors.linked_booking_id?.message}</FormMessage>
                  </FormItem>
                )}
              </div>

              {/* Conditional Payment Slip Upload (Restored Old Logic) */}
              {paymentStatuses.includes(watchedStatus) && (
                <div className="md:col-span-2 space-y-4 border-t pt-6 mt-4">
                  {/* Display info about 1st installment if current status is Full Payment and 1st existed */}
                  {watchedStatus === 'Paid (Full Payment)' && firstInstallmentPayment && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded dark:bg-slate-800/50">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">1st Installment Slip:</span> Already recorded.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewExistingSlip(firstInstallmentPayment.payment_slip_path)}
                        disabled={isViewUrlLoading}
                        title="View 1st Installment Slip"
                      >
                        {isViewUrlLoading && firstInstallmentPayment.payment_slip_path === (isViewUrlLoading && "PENDING_PATH_CHECK") ? ( 
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="mr-2 h-4 w-4" />
                        )}
                        View 1st Slip
                      </Button>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    {!paymentExistsForCurrentStatus && ( 
                      <>
                        <Label htmlFor="payment_slip_upload_single">
                          Upload Slip for <span className='font-semibold'>{watchedStatus}</span> (Max 5MB)
                        </Label>
                        <div className="flex items-center gap-4 mt-1">
                          <Input
                            id="payment_slip_upload_single"
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                            onChange={handleFileChange}
                            className="flex-grow"
                            disabled={isUploading}
                          />
                          {isUploading && <UploadCloud className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </div>
                        {selectedFile && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="text-red-500 hover:text-red-700 h-6 px-1"
                              disabled={isUploading}
                              aria-label="Clear selection"
                            >
                              <XIcon className="h-3 w-3 mr-1"/> Clear
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                    {paymentExistsForCurrentStatus && currentStatusPaymentRecord && ( 
                      <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50 dark:bg-slate-800/30">
                        <div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ✅ Slip Uploaded for "{watchedStatus}"
                          </p>
                           <p className="text-xs text-muted-foreground truncate max-w-xs" title={currentStatusPaymentRecord.payment_slip_path}>
                                File: {currentStatusPaymentRecord.payment_slip_path.split('/').pop()}
                           </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewExistingSlip(currentStatusPaymentRecord.payment_slip_path)}
                          disabled={isViewUrlLoading}
                          title={`View Slip for ${watchedStatus}`}
                        >
                          {isViewUrlLoading && currentStatusPaymentRecord.payment_slip_path === (isViewUrlLoading && "PENDING_PATH_CHECK") ? ( 
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="mr-2 h-4 w-4" />
                          )}
                          View Slip
                        </Button>
                      </div>
                    )}
                    {paymentExistsForCurrentStatus && selectedFile && (
                       <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                         Note: You have selected a new file <span className="font-semibold">({selectedFile.name})</span>.
                         Saving will replace the existing payment record for the status <span className="font-semibold">"{watchedStatus}"</span> if this status hasn't changed,
                         or create a new payment record if the status <span className="font-semibold">"{watchedStatus}"</span> is different from the one associated with the original slip.
                       </p>
                    )}
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <SubmitButton isEditing={isEditing} />
            </CardFooter>
          </Card>
        </form>
      </Form>

      <LinkedBookingSelectionModal
        isOpen={isLinkedBookingModalOpen}
        onClose={() => setIsLinkedBookingModalOpen(false)}
        onSelectBooking={handleSelectLinkedBooking}
        currentLinkedBookingId={form.getValues("linked_booking_id")}
      />
    </>
  );
} 