'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react'; // Import from react
import { useFormStatus } from 'react-dom'; // Keep useFormStatus from react-dom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem,
    FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea
import { addFareClass, updateFareClass, FareClassFormState } from '@/app/fares/actions';
import { fareClassSchema } from '@/lib/schemas';
import type { FareClass } from '@/types/database';

interface FareClassDialogProps {
  mode: 'add' | 'edit';
  fareClass?: FareClass | null; // Renamed from customer
  triggerButton: React.ReactNode;
}

// Submit Button (similar to customer version)
function SubmitButton({ mode }: { mode: 'add' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (mode === 'add' ? 'Adding...' : 'Saving...') : (mode === 'add' ? 'Add Fare Class' : 'Save Changes')}
    </Button>
  );
}

export function FareClassDialog({ mode, fareClass, triggerButton }: FareClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const action = mode === 'add' ? addFareClass : updateFareClass.bind(null, fareClass?.id || '');
  const [state, formAction] = useActionState<FareClassFormState, FormData>(action, { message: null });

  const form = useForm<z.infer<typeof fareClassSchema>>({
    resolver: zodResolver(fareClassSchema),
    defaultValues: {
      name: mode === 'edit' && fareClass ? fareClass.name : '',
      description: mode === 'edit' && fareClass ? fareClass.description || '' : '',
    },
    // Pass server errors to the form fields
    errors: state?.errors ? {
       name: state.errors.name ? { type: 'server', message: state.errors.name[0] } : undefined,
       description: state.errors.description ? { type: 'server', message: state.errors.description[0] } : undefined,
    } : {},
  });

  // Effect to close dialog on success and handle errors
  useEffect(() => {
    if (state?.message?.toLowerCase().includes('success')) {
        setIsOpen(false);
        form.reset();
    }
    // Re-populate errors if they come back from the server action
    if (state?.errors) {
      if (state.errors.name) {
          form.setError("name", { type: 'server', message: state.errors.name[0] });
      }
      if (state.errors.description) {
         form.setError("description", { type: 'server', message: state.errors.description[0] });
      }
    }
  }, [state, form, setIsOpen]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          form.reset(); // Reset on close
          // Resetting useFormState is tricky, usually rely on re-running action
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Fare Class' : 'Edit Fare Class'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Enter the details for the new fare class.' : `Editing fare class: ${fareClass?.name}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Economy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage /> 
                </FormItem>
              )}
            />

            {/* Display general form submission messages */}
            {state?.message && (
                 <p className={`text-sm font-medium ${state.errors ? 'text-red-600' : 'text-green-600'}`}>
                    {state.message}
                </p>
            )}

            <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <SubmitButton mode={mode} />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 