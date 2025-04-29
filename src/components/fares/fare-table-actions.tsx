'use client';

import { Button } from "@/components/ui/button";
import { FareClassDialog } from "./fare-class-dialog";
import { FareClassDeleteDialog } from "./fare-class-delete-dialog";
import type { FareClass } from "@/types/database";
import { Edit, Trash2 } from 'lucide-react'; // Use specific icons

interface FareTableActionsProps {
  fareClass: FareClass;
}

export function FareTableActions({ fareClass }: FareTableActionsProps) {
  return (
    <div className="flex justify-end space-x-2">
      {/* Edit Button Trigger */}
      <FareClassDialog
        mode="edit"
        fareClass={fareClass}
        triggerButton={
          <Button variant="outline" size="sm">
            <Edit className="mr-1 h-3 w-3" /> Edit
          </Button>
        }
      />
      {/* Delete Button Trigger */}
      <FareClassDeleteDialog
        fareClass={fareClass}
        triggerButton={
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        }
      />
    </div>
  );
} 