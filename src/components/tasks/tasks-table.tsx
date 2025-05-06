'use client';

import * as React from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { deleteTask } from "@/lib/actions/tasks";
import { type TaskWithBookingInfo, type TaskStatus } from "@/lib/types/tasks";

// --- Props Interface ---
interface TasksTableProps {
  initialTasks: TaskWithBookingInfo[];
  showCompleted: boolean;
}

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    // Assuming dateString is YYYY-MM-DD from DB
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return format(date, 'PP'); // e.g., May 6, 2025
  } catch {
    return 'Invalid Date';
  }
};

const isTaskOverdue = (task: TaskWithBookingInfo): boolean => {
  if (!task.due_date || task.status === 'Completed') {
    return false;
  }
  try {
    const dueDate = new Date(task.due_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only, ignore time
    return dueDate < today;
  } catch {
    return false; // Invalid date format
  }
};

// Helper to get badge Tailwind classes based on task status
const getTaskStatusClasses = (status: string): string => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'; // Green
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'; // Yellow
    case 'Pending':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'; // Light Red
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'; // Default/secondary gray
  }
};

// --- Main Component ---
export function TasksTable({ initialTasks, showCompleted }: TasksTableProps) {
  const router = useRouter();
  const [isDeletingTaskId, setIsDeletingTaskId] = React.useState<number | null>(null);

  // Filter tasks based on showCompleted status
  const filteredTasks = React.useMemo(() => {
    if (showCompleted) {
      return initialTasks; // Show all tasks
    }
    return initialTasks.filter(task => task.status !== 'Completed');
  }, [initialTasks, showCompleted]);

  // Update tasks if initialTasks prop changes is handled by useMemo dependency
  // React.useEffect(() => {
  //   setTasks(initialTasks); // This would overwrite filtered tasks if we used local state for filtering
  // }, [initialTasks]);

  // --- Delete Handling ---
  const executeDeleteTask = async (taskId: number) => {
    if (!taskId) return;
    setIsDeletingTaskId(taskId);
    try {
      const result = await deleteTask(taskId);
      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        router.refresh(); 
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not delete task.");
    } finally {
      setIsDeletingTaskId(null);
    }
  };

  // --- Render ---
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Task #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Linked Booking</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks && filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const linkedBookingInfo = task.tour_package_bookings 
                ? `${task.tour_package_bookings.customer_name || 'Customer N/A'} (${task.tour_package_bookings.tour_products?.name || 'Package N/A'})`
                : 'N/A';
              
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.id}</TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell className="text-xs">
                    {task.linked_tour_booking_id && task.tour_package_bookings ? (
                       <Link 
                         href={`/tour-packages/${task.linked_tour_booking_id}`}
                         className="hover:underline text-muted-foreground"
                         title={linkedBookingInfo}
                       >
                         {task.tour_package_bookings.customer_name || task.linked_tour_booking_id} 
                       </Link>
                     ) : task.linked_tour_booking_id ? (
                        <Link 
                          href={`/tour-packages/${task.linked_tour_booking_id}`}
                          className="hover:underline text-muted-foreground"
                          title={`View Booking ID: ${task.linked_tour_booking_id}`}
                        >
                          {task.linked_tour_booking_id}
                        </Link>
                     ) : (
                        '-'
                     )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border", getTaskStatusClasses(task.status))}>{task.status}</Badge>
                  </TableCell>
                  <TableCell className={cn(overdue && "text-destructive font-medium")}>
                    {overdue && <Clock className="inline-block mr-1 h-3 w-3 text-destructive" />}
                    {formatDate(task.due_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                             <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              disabled={isDeletingTaskId === task.id}
                              onSelect={(e) => e.preventDefault()} // Prevent closing menu when triggering dialog
                            >
                               <Trash2 className="mr-2 h-4 w-4" /> Delete
                             </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Confirm Task Deletion</AlertDialogTitle>
                           <AlertDialogDescription>
                             Are you sure you want to delete Task #{task.id} ("{task.description.substring(0, 50)}...")? This action cannot be undone.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel disabled={isDeletingTaskId === task.id}>Cancel</AlertDialogCancel>
                           <AlertDialogAction 
                            onClick={() => executeDeleteTask(task.id)} 
                            disabled={isDeletingTaskId === task.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                           >
                              {isDeletingTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Delete Task
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {showCompleted ? "No tasks found." : "No pending or in-progress tasks found."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 