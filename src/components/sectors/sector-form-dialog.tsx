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
import { addSector, updateSector } from '@/app/sectors/actions';
import { predefinedSectorSchema } from '@/lib/schemas';
import type { PredefinedSector } from '@/types/database';
import { Textarea } from "@/components/ui/textarea"; // Import Textarea

interface SectorFormDialogProps {
  mode: 'add' | 'edit';
  sector?: PredefinedSector | null;
  triggerButton: React.ReactNode;
}

function SubmitButton({ mode }: { mode: 'add' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (mode === 'add' ? 'Adding...' : 'Saving...') : (mode === 'add' ? 'Add Sector' : 'Save Changes')}
    </Button>
  );
}

export function SectorFormDialog({ mode, sector, triggerButton }: SectorFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const action = mode === 'add' ? addSector : updateSector.bind(null, sector?.id || '');
  const [state, formAction] = useActionState(action, { message: null });

  const form = useForm<z.infer<typeof predefinedSectorSchema>>({
    resolver: zodResolver(predefinedSectorSchema),
    defaultValues: {
      origin_code: mode === 'edit' && sector ? sector.origin_code : '',
      destination_code: mode === 'edit' && sector ? sector.destination_code : '',
      description: mode === 'edit' && sector ? (sector.description ?? '') : '',
    },
    // Use the state from useFormState to display errors
    errors: state?.errors ? {
        origin_code: state.errors.origin_code ? { type: 'server', message: state.errors.origin_code[0]} : undefined,
        destination_code: state.errors.destination_code ? { type: 'server', message: state.errors.destination_code[0]} : undefined,
        description: state.errors.description ? { type: 'server', message: state.errors.description[0]} : undefined,
     } : {},
  });

  useEffect(() => {
    if (state?.message && !state.errors && state.message.toLowerCase().includes('success')) {
        setIsOpen(false);
        form.reset();
    }
     if (state?.errors) {
        if(state.errors.origin_code) form.setError("origin_code", { type: 'server', message: state.errors.origin_code[0] });
        if(state.errors.destination_code) form.setError("destination_code", { type: 'server', message: state.errors.destination_code[0] });
        if(state.errors.description) form.setError("description", { type: 'server', message: state.errors.description[0] });
     }
  }, [state, form]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          form.reset();
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Sector' : 'Edit Sector'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Enter details for the new predefined sector.' : `Editing: ${sector?.origin_code} - ${sector?.destination_code}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Code (e.g., BKK)</FormLabel>
                      <FormControl>
                        <Input placeholder="BKK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Code (e.g., SIN)</FormLabel>
                      <FormControl>
                        <Input placeholder="SIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    {/* Use field.value check for controlled component */}
                    <Textarea placeholder="E.g., Bangkok - Singapore" {...field} value={field.value ?? ''} />
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