'use client';

import * as React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TasksTable } from "@/components/tasks/tasks-table";
import type { TaskWithBookingInfo } from "@/lib/types/tasks";

interface TasksDisplayControlsProps {
  initialTasks: TaskWithBookingInfo[];
}

export function TasksDisplayControls({ initialTasks }: TasksDisplayControlsProps) {
  const [showCompleted, setShowCompleted] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={(checkedState) => setShowCompleted(Boolean(checkedState))}
        />
        <Label htmlFor="show-completed" className="text-sm font-medium">
          Show completed tasks
        </Label>
      </div>
      <TasksTable initialTasks={initialTasks} showCompleted={showCompleted} />
    </div>
  );
} 