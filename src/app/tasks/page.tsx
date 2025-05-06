import * as React from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getTasks } from "@/lib/actions/tasks";
// import { TasksTable } from "@/components/tasks/tasks-table"; // Now imported by TasksDisplayControls
import { TasksDisplayControls } from "@/components/tasks/tasks-display-controls"; // Import the new component

// Optional: Revalidate this page periodically or on demand
// export const revalidate = 60; // Revalidate every 60 seconds
// export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function TasksPage() {
  // Fetch tasks data using the server action
  const tasks = await getTasks({ sortBy: 'due_date', ascending: true }); // Example sorting

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Tasks</h1>
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