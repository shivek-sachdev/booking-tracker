'use client';

import * as React from 'react';
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { TourProductForm } from './tour-product-form';
import { type TourProduct } from '@/lib/types/tours';

interface TourPackageFormDialogProps {
  mode: 'add' | 'edit';
  triggerButton: React.ReactNode;
  initialProduct?: TourProduct | null;
  onSuccess?: () => void; // Add the onSuccess prop for chaining
}

export function TourPackageFormDialog({ 
  mode, 
  triggerButton, 
  initialProduct = null, 
  onSuccess // Accept the new prop
}: TourPackageFormDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Title based on mode
  const title = mode === 'add' ? 'Create New Tour Package' : 'Edit Tour Package';

  // Updated success handler
  const handleSuccess = () => {
    setIsOpen(false); // Close the dialog
    onSuccess?.(); // Call the chained onSuccess (e.g., table refetch)
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Optional: Add description if needed */}
          {/* <DialogDescription>
            Make changes to the tour package here. Click save when you're done.
          </DialogDescription> */} 
        </DialogHeader>
        
        {/* Render the form inside */}
        {/* Pass isOpen and setIsOpen if form needs to control dialog state */}
        <TourProductForm 
          initialProduct={initialProduct} 
          onSuccess={handleSuccess} // Pass the handler here
        />

        {/* Footer might not be needed if form has its own submit/cancel */}
        {/* <DialogFooter>
           <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose> 
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
} 