'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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
import { addCustomer, updateCustomer } from '@/app/customers/actions';
import { customerSchema } from '@/lib/schemas';
import type { Customer } from '@/types/database';

interface CustomerFormDialogProps {
  mode: 'add' | 'edit';
  customer?: Customer | null;
  triggerButton: React.ReactNode;
}

// Separate component for the submit button to use useFormStatus
function SubmitButton({ mode }: { mode: 'add' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (mode === 'add' ? 'Adding...' : 'Saving...') : (mode === 'add' ? 'Add Customer' : 'Save Changes')}
    </Button>
  );
}

export function CustomerFormDialog({ mode, customer, triggerButton }: CustomerFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine the server action based on mode
  const action = mode === 'add' ? addCustomer : updateCustomer.bind(null, customer?.id || '');

  // Updated: use useActionState instead of useFormState 
  const [state, formAction] = useActionState(action, { message: null });

  // react-hook-form setup
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      company_name: mode === 'edit' && customer ? customer.company_name : '',
    },
    // Use the state from useFormState to display errors
    errors: state?.errors ? { company_name: { type: 'server', message: state.errors.company_name?.[0] } } : {},
  });

  // Effect to close dialog on successful submission and reset form
  useEffect(() => {
    if (state?.message && !state.errors) {
      // Check if the message indicates success (customize this check if needed)
      if (state.message.toLowerCase().includes('success')) {
        setIsOpen(false);
        form.reset(); // Reset form fields
        // Optionally, show a toast notification here
      }
    }
    // Re-populate errors if they come back from the server action
     if (state?.errors) {
        form.setError("company_name", { type: 'server', message: state.errors.company_name?.[0] });
     }
  }, [state, form, setIsOpen]);

  // Reset form state when dialog closes
  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          form.reset(); // Reset on close
          // Consider resetting useFormState state if needed, though it usually resets on next action
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Enter the details for the new customer.' : `Editing customer: ${customer?.company_name}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* Use form tag with action, not onSubmit for server actions */}
          <form action={formAction} className="space-y-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display general form submission messages */}
            {state?.message && !state.errors && (
                <p className="text-sm font-medium text-green-600">{state.message}</p>
            )}
            {state?.message && state.errors && (
                 <p className="text-sm font-medium text-red-600">{state.message}</p>
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