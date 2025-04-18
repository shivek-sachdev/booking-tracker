'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { deleteBooking } from '@/app/bookings/actions';
import type { Booking } from '@/types/database';
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

interface BookingDeleteDialogProps {
  booking: Pick<Booking, 'id' | 'booking_reference'>;
  triggerButton?: React.ReactNode;
  onDeleteSuccess?: () => void;
}

export function BookingDeleteDialog({ 
  booking, 
  triggerButton, 
  onDeleteSuccess 
}: BookingDeleteDialogProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setDeleteMessage(null); // Clear previous message
    startTransition(async () => {
      const result = await deleteBooking(booking.id);
      setDeleteMessage(result.message);
      
      if (!result.message?.toLowerCase().includes('error')) {
        // On success, close dialog after a short delay to allow message to be seen
        setTimeout(() => {
          setIsDeleteDialogOpen(false);
          
          // Either call the callback or redirect to bookings page
          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else {
            router.push('/bookings');
            router.refresh();
          }
        }, 1000);
      }
      // Keep dialog open on error to show the message
    });
  };

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogTrigger asChild>
        {triggerButton || <Button variant="destructive">Delete Booking</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the booking 
            <strong> {booking.booking_reference}</strong> and all associated sector data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteMessage && (
          <p className={`text-sm font-medium ${deleteMessage.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}>
            {deleteMessage}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault(); // Prevent the dialog from closing automatically
              handleDelete();
            }} 
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 