'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addCallReportUpdate } from '@/lib/actions/call-reports';
import {
  CallReportUpdateSchema,
  CallReportStatusEnum,
  type CallReportStatus,
  type CallReportUpdateFormData,
  type CallReportWithCustomer,
} from '@/lib/types/call-reports';

interface CallReportAddUpdateDialogProps {
  report: CallReportWithCustomer;
}

function parseDateField(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
}

function getDefaultValues(report: CallReportWithCustomer): CallReportUpdateFormData {
  return {
    note: '',
    status: report.status as CallReportStatus,
    next_action: report.next_action ?? '',
    next_follow_up_date: parseDateField(report.next_follow_up_date),
  };
}

export function CallReportAddUpdateDialog({ report }: CallReportAddUpdateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<CallReportUpdateFormData>({
    resolver: zodResolver(CallReportUpdateSchema),
    defaultValues: getDefaultValues(report),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(report));
    }
  }, [open, report, form]);

  const onSubmit = async (values: CallReportUpdateFormData) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, format(value, 'yyyy-MM-dd'));
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      } else if (key === 'next_action' || key === 'next_follow_up_date') {
        formData.append(key, '');
      }
    });

    try {
      const result = await addCallReportUpdate(report.id, formData);
      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (messages) {
              form.setError(field as keyof CallReportUpdateFormData, {
                type: 'server',
                message: messages.join(', '),
              });
            }
          });
        }
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Call report update form error:', error);
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Add update
      </Button>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add update</DialogTitle>
          <DialogDescription>
            Log progress for this call report. Each update is kept in history.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What happened?</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Progress, customer response, next steps..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status after this update</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CallReportStatusEnum.options.map((statusValue) => (
                          <SelectItem key={statusValue} value={statusValue}>
                            {statusValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="next_follow_up_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next follow-up (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => field.onChange(date ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="next_action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next action (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What to do next..." {...field} value={field.value ?? ''} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save update'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
