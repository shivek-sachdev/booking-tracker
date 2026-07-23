'use server';

import { revalidatePath } from 'next/cache';
import { createSimpleServerClient } from '@/lib/supabase/server';
import {
  CallReportSchema,
  CallReportStatusEnum,
  CallReportUpdateSchema,
  type CallReportFormData,
  type CallReportStatus,
  type CallReportUpdate,
  type CallReportWithCustomer,
  type CustomerSelectItem,
} from '@/lib/types/call-reports';

interface CallReportActionState {
  message: string;
  callReportId?: string;
  errors?: Record<string, string[]>;
  fieldValues?: Partial<CallReportFormData>;
}

interface CallReportUpdateActionState {
  message: string;
  errors?: Record<string, string[]>;
}

function formatDateForDb(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().split('T')[0];
}

function processFormEntries(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    contact_person: raw.contact_person || null,
    summary: raw.summary || null,
    customer_feedback: raw.customer_feedback || null,
    next_action: raw.next_action || null,
    report_date: raw.report_date || null,
    next_follow_up_date: raw.next_follow_up_date || null,
    status: raw.status || 'Follow Up',
  };
}

export async function addCustomerInline(
  companyName: string
): Promise<{ customer?: CustomerSelectItem; error?: string }> {
  const name = companyName?.trim();
  if (!name) return { error: 'Company name is required.' };

  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({ company_name: name })
    .select('id, company_name')
    .single();

  if (error) {
    console.error('Supabase error adding customer inline:', error);
    return { error: `Failed to add customer. ${error.message}` };
  }

  revalidatePath('/customers');
  return { customer: data as CustomerSelectItem };
}

export async function getCustomersForSelect(): Promise<CustomerSelectItem[]> {
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, company_name')
    .order('company_name', { ascending: true });

  if (error) {
    console.error('Supabase error fetching customers for select:', error);
    return [];
  }
  return (data as CustomerSelectItem[]) ?? [];
}

export async function getCallReports(): Promise<CallReportWithCustomer[]> {
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('call_reports')
    .select(`
      *,
      customers ( company_name )
    `)
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error fetching call reports:', error);
    return [];
  }
  return (data as CallReportWithCustomer[]) ?? [];
}

export async function getCallReportUpdates(callReportId: string): Promise<CallReportUpdate[]> {
  if (!callReportId) return [];
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('call_report_updates')
    .select('*')
    .eq('call_report_id', callReportId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Supabase error fetching call report updates for ${callReportId}:`, error);
    return [];
  }
  return (data as CallReportUpdate[]) ?? [];
}

export async function getCallReportById(id: string): Promise<CallReportWithCustomer | null> {
  if (!id) return null;
  const supabase = createSimpleServerClient();
  const { data, error } = await supabase
    .from('call_reports')
    .select(`
      *,
      customers ( company_name )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Supabase error fetching call report ${id}:`, error);
    return null;
  }
  return data as CallReportWithCustomer | null;
}

export async function createCallReport(
  _prevState: CallReportActionState | undefined,
  formData: FormData
): Promise<CallReportActionState> {
  const supabase = createSimpleServerClient();
  const processedData = processFormEntries(formData);

  const validatedFields = CallReportSchema.extend({
    status: CallReportStatusEnum,
  }).safeParse(processedData);

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    customer_id,
    contact_person,
    report_date,
    topic,
    summary,
    customer_feedback,
    status,
    next_action,
    next_follow_up_date,
  } = validatedFields.data;

  const dataToInsert = {
    customer_id,
    contact_person: contact_person ?? null,
    report_date: formatDateForDb(report_date)!,
    topic,
    summary: summary ?? null,
    customer_feedback: customer_feedback ?? null,
    status: status ?? 'Follow Up',
    next_action: next_action ?? null,
    next_follow_up_date: formatDateForDb(next_follow_up_date),
  };

  try {
    const { data: newReport, error } = await supabase
      .from('call_reports')
      .insert(dataToInsert)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase call report insert error:', error);
      return { message: `Database Error: Failed to create call report. ${error.message}` };
    }

    if (!newReport) {
      return { message: 'Database Error: Failed to get new call report ID after creation.' };
    }

    revalidatePath('/call-reports');
    return {
      message: 'Successfully created call report!',
      callReportId: newReport.id,
    };
  } catch (error) {
    console.error('Unexpected error creating call report:', error);
    return { message: 'Unexpected Error: Could not create call report.' };
  }
}

export async function updateCallReport(
  callReportId: string,
  formData: FormData
): Promise<CallReportActionState> {
  if (!callReportId) {
    return { message: 'Error: Missing Call Report ID for update.' };
  }

  const supabase = createSimpleServerClient();
  const processedData = processFormEntries(formData);

  const validatedFields = CallReportSchema.extend({
    status: CallReportStatusEnum,
  }).safeParse(processedData);

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    customer_id,
    contact_person,
    report_date,
    topic,
    summary,
    customer_feedback,
    status,
    next_action,
    next_follow_up_date,
  } = validatedFields.data;

  const dataToUpdate = {
    customer_id,
    contact_person: contact_person ?? null,
    report_date: formatDateForDb(report_date)!,
    topic,
    summary: summary ?? null,
    customer_feedback: customer_feedback ?? null,
    status: status as CallReportStatus,
    next_action: next_action ?? null,
    next_follow_up_date: formatDateForDb(next_follow_up_date),
  };

  try {
    const { error } = await supabase
      .from('call_reports')
      .update(dataToUpdate)
      .eq('id', callReportId);

    if (error) {
      console.error('Supabase call report update error:', error);
      return { message: `Database Error: Failed to update call report. ${error.message}` };
    }

    revalidatePath('/call-reports');
    revalidatePath(`/call-reports/${callReportId}`);
    revalidatePath(`/call-reports/${callReportId}/edit`);
    return { message: 'Successfully updated call report!' };
  } catch (error) {
    console.error(`Unexpected error updating call report ${callReportId}:`, error);
    return { message: 'Unexpected Error: Could not update call report.' };
  }
}

function processUpdateFormEntries(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    note: raw.note,
    status: raw.status || 'Follow Up',
    next_action: raw.next_action || null,
    next_follow_up_date: raw.next_follow_up_date || null,
  };
}

export async function addCallReportUpdate(
  callReportId: string,
  formData: FormData
): Promise<CallReportUpdateActionState> {
  if (!callReportId) {
    return { message: 'Error: Missing Call Report ID.' };
  }

  const supabase = createSimpleServerClient();
  const processedData = processUpdateFormEntries(formData);

  const validatedFields = CallReportUpdateSchema.safeParse(processedData);
  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { note, status, next_action, next_follow_up_date } = validatedFields.data;

  const updateRow = {
    call_report_id: callReportId,
    note,
    status,
    next_action: next_action ?? null,
    next_follow_up_date: formatDateForDb(next_follow_up_date),
  };

  const { error: insertError } = await supabase.from('call_report_updates').insert(updateRow);

  if (insertError) {
    console.error('Supabase call report update insert error:', insertError);
    return { message: `Database Error: Failed to add update. ${insertError.message}` };
  }

  const { error: syncError } = await supabase
    .from('call_reports')
    .update({
      status,
      next_action: next_action ?? null,
      next_follow_up_date: formatDateForDb(next_follow_up_date),
    })
    .eq('id', callReportId);

  if (syncError) {
    console.error('Supabase call report parent sync error:', syncError);
    return { message: `Database Error: Update saved but failed to sync status. ${syncError.message}` };
  }

  revalidatePath('/call-reports');
  revalidatePath(`/call-reports/${callReportId}`);
  revalidatePath(`/call-reports/${callReportId}/edit`);
  return { message: 'Successfully added update!' };
}

export async function deleteCallReport(callReportId: string): Promise<{ message: string }> {
  if (!callReportId) {
    return { message: 'Error: Missing Call Report ID for deletion.' };
  }

  const supabase = createSimpleServerClient();

  try {
    const { error } = await supabase.from('call_reports').delete().eq('id', callReportId);

    if (error) {
      console.error('Supabase delete call report error:', error);
      return { message: `Database Error: Failed to delete call report. ${error.message}` };
    }

    revalidatePath('/call-reports');
    return { message: 'Success: Call report deleted.' };
  } catch (error) {
    console.error(`Unexpected delete call report error for ${callReportId}:`, error);
    return { message: 'Unexpected Error: Could not delete call report.' };
  }
}
