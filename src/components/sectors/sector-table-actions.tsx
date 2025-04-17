'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { SectorFormDialog } from './sector-form-dialog';
import { deleteSector } from '@/app/sectors/actions';
import type { PredefinedSector } from '@/types/database';
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

interface SectorTableActionsProps {
  sector: PredefinedSector;
}

export function SectorTableActions({ sector }: SectorTableActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setDeleteMessage(null); // Clear previous message
    startTransition(async () => {
      const result = await deleteSector(sector.id);
      setDeleteMessage(result.message);
      if (!result.message?.toLowerCase().includes('error')) {
         setIsDeleteDialogOpen(false);
      } // Keep open on error to show message
    });
  };

  return (
    <div className="flex justify-end space-x-2">
      <SectorFormDialog
        mode="edit"
        sector={sector}
        triggerButton={<Button variant="outline" size="sm">Edit</Button>}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will remove the sector and all associated data (booking sectors).
              If you&apos;re unsure, consider keeping the sector.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMessage && (
             <p className={`text-sm font-medium ${deleteMessage.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                {deleteMessage}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setDeleteMessage(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 