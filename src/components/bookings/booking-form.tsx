'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation'; // For potential navigation
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // For merging classNames
import { bookingFormSchema, BookingFormData } from '@/lib/schemas';
import { addBooking, updateBooking, type BookingActionState } from '@/app/bookings/actions'; // Use addBooking directly
import type { Customer, PredefinedSector, BookingStatus } from '@/types/database';

// Add mode and initialData props
interface BookingFormProps {
  customers: Customer[];
  predefinedSectors: PredefinedSector[]; 
  // Update mode to include 'edit'
  mode: 'add' | 'edit-simple' | 'edit'; 
  bookingId?: string; // Required for edit modes
  initialData?: Partial<BookingFormData>; // Data to pre-fill form in edit modes
}

// Remove the unused SubmitButton component
// function SubmitButton() {
//   const { pending } = useFormStatus();
//   return (
//     <Button type="submit" disabled={pending} size="lg">
//       {pending ? 'Saving Booking...' : 'Save Booking'}
//     </Button>
//   );
// }

// Update component signature and logic
export function BookingForm({ 
    customers, 
    predefinedSectors, 
    mode, // Mode can now be 'edit'
    bookingId, 
    initialData,
}: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema), 
    // Update defaultValues logic for 'edit' mode (similar to 'edit-simple' but uses full data)
    defaultValues: (mode === 'edit' || mode === 'edit-simple') 
      ? {
          customer_id: initialData?.customer_id || '',
          booking_reference: initialData?.booking_reference || '',
          deadline: initialData?.deadline ? new Date(initialData.deadline) : null,
          // For 'edit' mode, use initial booking_type and sectors
          // For 'edit-simple', these might be undefined/empty but are handled
          booking_type: initialData?.booking_type, 
          sectors: initialData?.sectors || [], 
        }
      : { // Default values for 'add' mode 
          customer_id: '',
          booking_type: undefined,
          booking_reference: '',
          deadline: null,
          sectors: [
            { 
              predefined_sector_id: '', 
              travel_date: null, 
              flight_number: '', 
              status: 'Waiting List' as BookingStatus,
              num_pax: 1,
            },
          ],
        },
  });

  // Effect to handle redirection after successful form submission
  useEffect(() => {
    if (isSuccess) {
      const redirectTimer = setTimeout(() => {
        if (mode === 'add') {
          // For new bookings, go to the booking listing page
          router.push('/bookings');
        } else if (bookingId) {
          // For edits, go to the booking detail page
          router.push(`/bookings/${bookingId}`);
        }
        router.refresh();
      }, 1000); // Short delay to show success message
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isSuccess, mode, bookingId, router]);

  // Simplified submit handler
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setIsSuccess(false);
    
    form.handleSubmit(async (data) => {
      const formData = new FormData();
      
      // Append common fields
      formData.append('customer_id', data.customer_id);
      formData.append('booking_reference', data.booking_reference || '');
      if (data.deadline) {
        formData.append('deadline', format(data.deadline, 'yyyy-MM-dd'));
      }

      // Append fields specific to 'add' or 'edit' mode
      if (mode === 'add' || mode === 'edit') {
        formData.append('booking_type', data.booking_type || '');
        const sectorsForJson = data.sectors.map(sector => ({
          ...sector,
          travel_date: sector.travel_date ? format(sector.travel_date, 'yyyy-MM-dd') : null
        }));
        formData.append('sectorsJson', JSON.stringify(sectorsForJson));
      }
      
      startTransition(async () => {
        try {
          let result: BookingActionState;
          // Choose the correct server action based on mode
          if (mode === 'edit' || mode === 'edit-simple') { // Use updateBooking for both edit modes
            if (!bookingId) {
                throw new Error("Booking ID is missing for update.");
            }
            result = await updateBooking(bookingId, formData);
          } else { // 'add' mode
            result = await addBooking(undefined, formData);
          }
          
          // Handle successful result
          if (result.message?.includes('successfully')) {
            setStatusMessage(result.message);
            setIsSuccess(true);
            // Navigation is now handled by the useEffect
          } 
          // Handle validation errors from server
          else if (result.errors && result.errors.length > 0) {
            setStatusMessage(result.message || 'Validation failed');
            result.errors.forEach(issue => {
              const path = issue.path.join('.');
              if (path) {
                form.setError(path as keyof BookingFormData, { type: 'server', message: issue.message });
              }
            });
          } 
          // Handle other errors
          else if (result.message) {
            setStatusMessage(result.message);
          } else {
            setStatusMessage(`Failed to ${mode === 'add' ? 'save' : 'update'} booking.`); // Simplified message
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          console.error(`Error submitting form in ${mode} mode:`, errorMessage);
          setStatusMessage(`Failed to ${mode === 'add' ? 'save' : 'update'} booking. Please try again.`); // Simplified message
        }
      });
    })(event); 
  };

  // FieldArray setup is fine, rendering is conditional
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sectors",
  });

  // Watch bookingType only if relevant (add or edit mode)
  const bookingType = useWatch({ control: form.control, name: "booking_type" });
  const currentSectors = useWatch({ control: form.control, name: "sectors" });

  // Effect for adding second sector only runs in 'add' mode
  useEffect(() => {
    // Keep this effect only for 'add' mode
    if (mode === 'add' && bookingType === 'Return' && currentSectors.length === 1) {
      append({ 
        predefined_sector_id: '', 
        travel_date: null, 
        flight_number: '', 
        status: 'Waiting List' as BookingStatus,
        num_pax: 1,
      });
    }
  }, [mode, bookingType, currentSectors?.length, append]);

  // Logic for adding/removing sectors should work in 'edit' mode as well
  const canAddSector = 
      (mode === 'add' || mode === 'edit') && 
      (bookingType === 'Return' && currentSectors?.length < 2 || 
       bookingType === 'One-Way' && currentSectors?.length < 1 || 
       !bookingType); // Allow adding if type not selected yet in add mode

  const addSectorRow = () => {
    if (!canAddSector) return;
    append({ 
      predefined_sector_id: '', 
      travel_date: null, 
      flight_number: '', 
      status: 'Waiting List' as BookingStatus,
      num_pax: 1,
    });
  };

  const removeSectorRow = (index: number) => {
    // Allow removal in add/edit modes if more than one sector exists
    if ((mode === 'add' || mode === 'edit') && fields.length > 1) {
      remove(index);
    } 
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Status message display (no changes needed) */} 
        {statusMessage && (
          <div className={`p-4 rounded-md text-sm ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {statusMessage}
          </div>
        )}

        <div className="space-y-6">
            {/* Section 1: Booking Details (No changes needed) */}
            <Card>
                <CardHeader><CardTitle>1. Booking Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {/* Customer Select - Always shown */}
                    <FormField
                        control={form.control}
                        name="customer_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Customer *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {customers.length > 0 ? (
                                    customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                        {c.company_name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-customers" disabled>
                                        No customers available
                                    </SelectItem>
                                )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    
                    {/* Booking Type - Show in 'add' or 'edit' mode */}
                    {(mode === 'add' || mode === 'edit') && (
                        <FormField
                            control={form.control}
                            name="booking_type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Booking Type *</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex space-x-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="One-Way" />
                                            </FormControl>
                                            <FormLabel className="font-normal">One-Way</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="Return" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Return</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                    )}
                </CardContent>
            </Card>

            {/* Section 2: Sectors - Show in 'add' or 'edit' mode */}
            {(mode === 'add' || mode === 'edit') && (
              <Card>
                  <CardHeader><CardTitle>2. Sectors *</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <>
                          {fields.map((field, index) => (
                              <div key={field.id} className="p-4 border rounded space-y-4 relative">
                                  {/* ... existing sector fields ... */}
                                   <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-medium">Sector {index + 1}</h4>
                                      {/* Allow removing only if more than 1 sector exists */}
                                      {fields.length > 1 && ( <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSectorRow(index)}><Trash2 className="h-4 w-4" /></Button> )}
                                  </div>
                                  
                                      {/* Route Select */}
                                      <FormField control={form.control} name={`sectors.${index}.predefined_sector_id`} render={({ field: sf }) => ( <FormItem><FormLabel>Route *</FormLabel><Select onValueChange={sf.onChange} defaultValue={sf.value}><FormControl><SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger></FormControl><SelectContent>{predefinedSectors.map((s) => (<SelectItem key={s.id} value={s.id}>{`${s.origin_code}-${s.destination_code}${s.description?` (${s.description})`:``}`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                      
                                      {/* Number of Passengers input */}
                                      <FormField control={form.control} name={`sectors.${index}.num_pax`} render={({ field: sf }) => ( <FormItem><FormLabel>Passengers *</FormLabel><FormControl><Input type="number" placeholder="e.g., 2" {...sf} onChange={event => sf.onChange(+event.target.value)} /></FormControl><FormMessage /></FormItem> )}/>
                                      
                                      {/* Travel Date */}
                                      <FormField control={form.control} name={`sectors.${index}.travel_date`} render={({ field: sf }) => ( <FormItem className="flex flex-col"><FormLabel>Travel Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !sf.value && "text-muted-foreground")} >{sf.value ? format(sf.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={sf.value ?? undefined} onSelect={sf.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                      
                                      {/* Flight Number Input */}
                                      <FormField control={form.control} name={`sectors.${index}.flight_number`} render={({ field: sf }) => ( <FormItem><FormLabel>Flight Number</FormLabel><FormControl><Input placeholder="e.g., TG123" {...sf} value={sf.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
                                      
                                      {/* Status Radio Group */}
                                      <FormField control={form.control} name={`sectors.${index}.status`} render={({ field: sf }) => ( <FormItem className="space-y-2"><FormLabel>Status *</FormLabel><FormControl><RadioGroup onValueChange={sf.onChange} defaultValue={sf.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Confirmed" /></FormControl><FormLabel className="font-normal">Confirmed</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Waiting List" /></FormControl><FormLabel className="font-normal">Waiting List</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )}/>
                              </div>
                          ))}
                          {/* Add Sector Button - enable in add/edit */}
                          <Button type="button" variant="outline" size="sm" onClick={addSectorRow} disabled={!canAddSector} className="mt-2">
                              <PlusCircle className="mr-2 h-4 w-4" /> Add Sector
                          </Button>
                          {/* Sectors array validation errors */}
                          {form.formState.errors.sectors?.root?.message && ( <p className="text-sm font-medium text-destructive">{form.formState.errors.sectors.root.message}</p> )}
                          {typeof form.formState.errors.sectors === 'string' && ( <p className="text-sm font-medium text-destructive">{form.formState.errors.sectors}</p> )}
                      </>
                  </CardContent>
              </Card>
            )}

            {/* Section 3: References & Deadlines - Always shown */}
            <Card>
                <CardHeader><CardTitle>3. References & Deadlines</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {/* Booking Reference */}
                    <FormField
                        control={form.control}
                        name="booking_reference"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Booking Reference *</FormLabel>
                            <FormControl><Input placeholder="e.g., AB12CD" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    {/* Deadline */}
                    <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Deadline</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} >
                                        {field.value ? format(field.value, "PPP") : <span>Pick a deadline date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>
        </div>

        {/* Submit Button Text Update */}
        <Button type="submit" disabled={isPending || isSuccess} size="lg">
          {isPending ? 'Saving...' : (mode === 'add' ? 'Save Booking' : 'Update Booking')} 
        </Button>
      </form>
    </Form>
  );
}