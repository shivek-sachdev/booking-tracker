'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Import DialogClose for explicit cancel button behavior
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode; // Allow ReactNode for more flexible descriptions
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  isConfirming?: boolean; // To show loading state on confirm button
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonVariant = 'default',
  isConfirming = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onEscapeKeyDown={onClose} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {typeof description === 'string' ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            description // Render as ReactNode if not a simple string
          )}
        </DialogHeader>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
              {cancelButtonText}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={confirmButtonVariant}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 