import { z } from 'zod';

export const CallReportStatusEnum = z.enum([
  'Follow Up',
  'Confirmed',
  'Closed',
  'No Action',
]);
export type CallReportStatus = z.infer<typeof CallReportStatusEnum>;

export const CallReportSchema = z.object({
  customer_id: z.string().uuid({ message: 'Please select a customer.' }),
  contact_person: z.string().max(255).optional().nullable(),
  report_date: z.coerce.date({ required_error: 'Report date is required.' }),
  topic: z.string().min(1, { message: 'Topic is required.' }),
  summary: z.string().optional().nullable(),
  customer_feedback: z.string().optional().nullable(),
  status: CallReportStatusEnum.optional(),
  next_action: z.string().optional().nullable(),
  next_follow_up_date: z.coerce.date().nullable().optional(),
});

export type CallReportFormData = z.infer<typeof CallReportSchema>;

export interface CallReportWithCustomer {
  id: string;
  customer_id: string;
  contact_person: string | null;
  report_date: string;
  topic: string;
  summary: string | null;
  customer_feedback: string | null;
  status: CallReportStatus;
  next_action: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  customers?: {
    company_name: string;
  } | null;
}

export interface CustomerSelectItem {
  id: string;
  company_name: string;
}

export const CallReportUpdateSchema = z.object({
  note: z.string().min(1, { message: 'Update note is required.' }),
  status: CallReportStatusEnum,
  next_action: z.string().optional().nullable(),
  next_follow_up_date: z.coerce.date().nullable().optional(),
});

export type CallReportUpdateFormData = z.infer<typeof CallReportUpdateSchema>;

export interface CallReportUpdate {
  id: string;
  call_report_id: string;
  note: string;
  status: CallReportStatus;
  next_action: string | null;
  next_follow_up_date: string | null;
  created_at: string;
}
