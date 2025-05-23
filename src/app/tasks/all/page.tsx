import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getTasks } from "@/lib/actions/tasks";
import { TasksDisplayControls } from "@/components/tasks/tasks-display-controls";

// Optional: Revalidate this page periodically or on demand
// export const revalidate = 60; // Revalidate every 60 seconds
// export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function AllTasksPage() {
  // Fetch tasks data using the server action
  const tasks = await getTasks({ sortBy: 'due_date', ascending: true }); // Example sorting

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tasks">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">All Tasks</h1>
            <p className="text-muted-foreground text-sm">
              Manage and track all your tasks
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
          </Link>
        </Button>
      </div>
      
      <TasksDisplayControls initialTasks={tasks} />
    </div>
  );
} 