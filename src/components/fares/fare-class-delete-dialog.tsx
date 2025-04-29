'use client';

import { useState, useTransition } from 'react';
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
} from "@/components/ui/alert-dialog";
import { deleteFareClass } from '@/app/fares/actions';
import type { FareClass } from '@/types/database';
// Removed toast import - add your preferred notification system if desired

interface FareClassDeleteDialogProps {
  fareClass: Pick<FareClass, 'id' | 'name'>; 
  triggerButton: React.ReactNode;
  onSuccess?: () => void; 
}

export function FareClassDeleteDialog({
  fareClass,
  triggerButton,
  onSuccess,
}: FareClassDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    setErrorMessage(null); // Clear previous errors
    startTransition(async () => {
      const result = await deleteFareClass(fareClass.id);
      if (result.message?.toLowerCase().includes('success')) {
        console.log("Success:", result.message); 
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(); 
        }
      } else {
        console.error("Error deleting fare class:", result.message);
        setErrorMessage(result.message ?? 'An unknown error occurred.'); 
        // Keep dialog open on error to show message
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { 
      setIsOpen(open); 
      if (!open) setErrorMessage(null); // Clear error when closing
    }}>
      <AlertDialogTrigger asChild>
        {triggerButton}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the 
            <strong className="mx-1">{fareClass.name}</strong> 
            fare class. If this fare class is currently assigned to any booking sectors,
            those sectors will have their fare class association removed (set to null).
            {errorMessage && (
              <p className="mt-2 text-red-600">Error: {errorMessage}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Yes, delete fare class'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 