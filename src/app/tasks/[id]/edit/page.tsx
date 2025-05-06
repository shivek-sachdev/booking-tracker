import { notFound } from 'next/navigation';
import { TaskForm } from '@/components/tasks/task-form';
import { getTaskById } from '@/lib/actions/tasks';

export async function generateStaticParams() {
  return [];
}

export default async function EditTaskPage(
  props: {
    params: Promise<{ id: string }> | undefined;
    searchParams: Promise<{ [key: string]: string | string[] | undefined; }> | undefined;
  }
) {
  if (!props.params) {
    console.error("EditTaskPage: props.params is undefined");
    notFound();
  }

  const resolvedParams = await props.params;
  const { id } = resolvedParams;

  const taskId = parseInt(id, 10);

  if (isNaN(taskId)) {
    console.error(`EditTaskPage: Invalid task ID format: ${id}`);
    notFound();
  }

  const task = await getTaskById(taskId);

  if (!task) {
    console.warn(`EditTaskPage: Task not found for ID: ${taskId}`);
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Edit Task #{task.id}</h1>
      <TaskForm initialTask={task} />
    </div>
  );
} 