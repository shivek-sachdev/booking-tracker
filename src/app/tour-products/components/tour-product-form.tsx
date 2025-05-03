'use client';

import React, { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { toast } from "sonner";

import { type TourProduct } from '@/lib/types/tours';
import { createTourProduct, updateTourProduct } from '@/lib/actions/tour-products';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface TourProductFormProps {
  initialProduct: TourProduct | null; // null for create, object for edit
  onSuccess?: () => void; // Add optional callback
}

// Separate component for the submit button to use useFormStatus
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Package' : 'Create Package')}
    </Button>
  );
}

export function TourProductForm({ initialProduct, onSuccess }: TourProductFormProps) {
  const isEditing = !!initialProduct?.id;

  // Determine which action to use
  const action = isEditing ? updateTourProduct.bind(null, initialProduct.id) : createTourProduct;

  const initialState = { message: '', errors: {} };
  const [state, formAction] = useActionState(action, initialState);

  // Effect to show toast on success/error and call onSuccess callback
  useEffect(() => {
    if (state.message) {
      if (state.message.startsWith('Success')) {
        toast.success(state.message);
        onSuccess?.();
      } else if (!state.errors || Object.keys(state.errors).length === 0) {
        toast.error(state.message);
      }
    }
  }, [state, onSuccess]);

  return (
      <form action={formAction} className="space-y-4">
         {/* Form content directly within the form element */}
         <div className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input 
                id="name" 
                name="name" 
                required 
                defaultValue={initialProduct?.name}
                aria-describedby="name-error"
              />
              <div id="name-error" aria-live="polite" aria-atomic="true">
                {state.errors?.name &&
                  state.errors.name.map((error: string) => (
                    <p className="text-sm font-medium text-destructive" key={error}>
                      {error.replace('Product name', 'Package name')}
                    </p>
                  ))}
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={initialProduct?.description ?? ''}
                rows={4}
                aria-describedby="description-error"
              />
              <div id="description-error" aria-live="polite" aria-atomic="true">
                {state.errors?.description &&
                  state.errors.description.map((error: string) => (
                    <p className="text-sm font-medium text-destructive" key={error}>
                      {error}
                    </p>
                  ))}
              </div>
            </div>
         </div>

         {/* Submit Button at the end of the form */}
          <div className="flex justify-end pt-4"> 
            <SubmitButton isEditing={isEditing} />
          </div>
      </form>
  );
} 