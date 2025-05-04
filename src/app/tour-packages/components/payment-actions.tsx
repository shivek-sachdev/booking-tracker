'use client';

import { useState, useTransition } from 'react';
import { Eye, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog'; // Assuming Shadcn Alert Dialog is installed
import { deletePaymentRecord, createPaymentSlipSignedUrl } from '@/lib/actions/tour-package-bookings';
import { toast } from 'sonner';

interface PaymentActionsProps {
  paymentId: string;
  slipPath: string;
}

export function PaymentActions({ paymentId, slipPath }: PaymentActionsProps) {
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isUrlLoading, startUrlTransition] = useTransition(); // <-- Transition for URL loading
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deletePaymentRecord(paymentId);
      if (result.success) {
        toast.success(result.message);
        setIsDialogOpen(false); // Close dialog on success
        // Revalidation happens via the server action
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleViewClick = () => {
    if (!slipPath) {
      toast.error("No payment slip path found.");
      return;
    }
    startUrlTransition(async () => {
        const result = await createPaymentSlipSignedUrl(slipPath);
        if (result.success && result.url) {
            window.open(result.url, '_blank', 'noopener,noreferrer');
        } else {
            toast.error(result.message || "Failed to get viewable link.");
        }
    });
  };

  return (
    <div className="space-x-2 flex items-center">
      {/* View Button - Modified */}
      <Button 
        variant="outline" 
        size="icon" 
        title="View Slip" 
        onClick={handleViewClick} 
        disabled={isUrlLoading || !slipPath} // Disable while loading URL or if no path
      >
        {isUrlLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" /> 
        ) : (
            <Eye className="h-4 w-4" />
        )}
      </Button>

      {/* Delete Button with Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            size="icon" 
            title="Delete Payment" 
            disabled={isDeletePending} // Disable trigger if delete is pending
            >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment 
              record and the associated payment slip file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeletePending}>
              {isDeletePending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 