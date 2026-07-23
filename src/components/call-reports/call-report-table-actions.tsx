'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { deleteCallReport } from '@/lib/actions/call-reports';
import type { CallReportWithCustomer } from '@/lib/types/call-reports';
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
} from '@/components/ui/alert-dialog';

interface CallReportTableActionsProps {
  report: CallReportWithCustomer;
}

export function CallReportTableActions({ report }: CallReportTableActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCallReport(report.id);
      setDeleteMessage(result.message);
      if (!result.message.toLowerCase().includes('error')) {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  return (
    <div className="flex justify-end space-x-2">
      <Button size="sm" asChild>
        <Link href={`/call-reports/${report.id}`}>Details</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/call-reports/${report.id}/edit`}>Edit</Link>
      </Button>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this call report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The visit log for &quot;{report.topic}&quot; will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMessage && (
            <p
              className={`text-sm ${deleteMessage.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}
            >
              {deleteMessage}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
