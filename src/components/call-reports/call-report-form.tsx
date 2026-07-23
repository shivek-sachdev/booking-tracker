'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  addCustomerInline,
  createCallReport,
  updateCallReport,
} from '@/lib/actions/call-reports';
import {
  CallReportSchema,
  CallReportStatusEnum,
  type CallReportFormData,
  type CallReportStatus,
  type CallReportWithCustomer,
  type CustomerSelectItem,
} from '@/lib/types/call-reports';

interface CallReportFormProps {
  initialReport: CallReportWithCustomer | null;
  customers: CustomerSelectItem[];
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending
        ? isEditing
          ? 'Updating...'
          : 'Creating...'
        : isEditing
          ? 'Update Call Report'
          : 'Create Call Report'}
    </Button>
  );
}

function parseDateField(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
}

export function CallReportForm({ initialReport, customers: initialCustomers }: CallReportFormProps) {
  const router = useRouter();
  const isEditing = !!initialReport?.id;

  const [customers, setCustomers] = React.useState<CustomerSelectItem[]>(initialCustomers);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [addCustomerError, setAddCustomerError] = React.useState<string | null>(null);
  const [isAddingCustomer, startAddCustomer] = React.useTransition();

  const form = useForm<CallReportFormData>({
    resolver: zodResolver(CallReportSchema),
    defaultValues: {
      customer_id: initialReport?.customer_id ?? '',
      contact_person: initialReport?.contact_person ?? '',
      report_date: parseDateField(initialReport?.report_date) ?? new Date(),
      topic: initialReport?.topic ?? '',
      summary: initialReport?.summary ?? '',
      customer_feedback: initialReport?.customer_feedback ?? '',
      status: (initialReport?.status as CallReportStatus) ?? CallReportStatusEnum.Enum['Follow Up'],
      next_action: initialReport?.next_action ?? '',
      next_follow_up_date: parseDateField(initialReport?.next_follow_up_date),
    },
  });

  const onSubmit = async (values: CallReportFormData) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, format(value, 'yyyy-MM-dd'));
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      } else if (key === 'next_follow_up_date' || key === 'contact_person') {
        formData.append(key, '');
      }
    });

    try {
      const result =
        isEditing && initialReport?.id
          ? await updateCallReport(initialReport.id, formData)
          : await createCallReport(undefined, formData);

      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        router.push('/call-reports');
        router.refresh();
      } else {
        let errorMessage = result.message;
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (messages) {
              form.setError(field as keyof CallReportFormData, {
                type: 'server',
                message: messages.join(', '),
              });
            }
          });
          errorMessage = 'Validation failed. Please check the fields.';
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Call report form submission error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const handleAddCustomer = () => {
    setAddCustomerError(null);
    startAddCustomer(async () => {
      const result = await addCustomerInline(newCustomerName);
      if (result.error || !result.customer) {
        setAddCustomerError(result.error ?? 'Failed to add customer.');
        return;
      }
      const created = result.customer;
      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.company_name.localeCompare(b.company_name))
      );
      form.setValue('customer_id', created.id, { shouldValidate: true, shouldDirty: true });
      setNewCustomerName('');
      setIsAddCustomerOpen(false);
      toast.success(`Added customer "${created.company_name}"`);
    });
  };

  const dateField = (
    name: 'report_date' | 'next_follow_up_date',
    label: string,
    optional?: boolean
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  {field.value ? format(field.value, 'PPP') : <span>{optional ? 'Pick a date (optional)' : 'Pick a date'}</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ?? undefined}
                onSelect={(date) => field.onChange(date ?? (optional ? null : undefined))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Call Report' : 'New Call Report'}</CardTitle>
            <CardDescription>
              Record who you visited, what you discussed, and any follow-up needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Add new customer"
                        onClick={() => {
                          setAddCustomerError(null);
                          setIsAddCustomerOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Name or role" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dateField('report_date', 'Visit date')}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="What did you discuss?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Details of the conversation..." {...field} value={field.value ?? ''} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer feedback (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Feedback from the customer..." {...field} value={field.value ?? ''} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="next_action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next action (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What to follow up on..." {...field} value={field.value ?? ''} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {dateField('next_follow_up_date', 'Next follow-up date', true)}
          </CardContent>
          <CardFooter className="border-t px-6 py-4 flex justify-end">
            <SubmitButton isEditing={isEditing} />
          </CardFooter>
        </Card>
      </form>
    </Form>

    <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>Enter the company name to add it to the list.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="Enter company name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomer();
              }
            }}
            disabled={isAddingCustomer}
            autoFocus
          />
          {addCustomerError && <p className="text-sm text-red-600">{addCustomerError}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddCustomerOpen(false)}
            disabled={isAddingCustomer}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddCustomer}
            disabled={isAddingCustomer || !newCustomerName.trim()}
          >
            {isAddingCustomer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isAddingCustomer ? 'Adding...' : 'Add Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
