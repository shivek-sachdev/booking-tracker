'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { CustomerFormDialog } from './customer-form-dialog'; // Import the dialog
import { deleteCustomer } from '@/app/customers/actions';
import type { Customer } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CustomerTableActionsProps {
  customer: Customer;
}

export function CustomerTableActions({ customer }: CustomerTableActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      setDeleteMessage(result.message);
      if (!result.message?.toLowerCase().includes('error')) {
         // Optionally close the dialog after a short delay or keep it open to show success
         // For now, we just show the message below the buttons
         // If successful, revalidation should update the table
         setIsDeleteDialogOpen(false); // Close dialog on success
      } else {
          // Keep dialog open to show error
      }
    });
  };

  return (
    <div className="flex justify-end space-x-2">
       {/* Edit Button wrapped by Dialog Trigger */}
      <CustomerFormDialog
        mode="edit"
        customer={customer}
        triggerButton={<Button variant="outline" size="sm">Edit</Button>}
      />

      {/* Delete Button with Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will remove the customer and all associated data.
              If you&apos;re unsure, consider inactivating the customer instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMessage && (
             <p className={`text-sm ${deleteMessage.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                {deleteMessage}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 