import Link from 'next/link';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ResponsiveCard,
  ResponsiveCardContainer,
  ResponsiveCardItem,
  ResponsiveTable,
} from '@/components/ui/responsive-table';
import { CallReportTableActions } from '@/components/call-reports/call-report-table-actions';
import { formatDate } from '@/lib/utils/formatting';
import type { CallReportWithCustomer } from '@/lib/types/call-reports';

interface CallReportsTableProps {
  reports: CallReportWithCustomer[];
}

export function CallReportsTable({ reports }: CallReportsTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <ResponsiveTable caption="Call reports list.">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length > 0 ? (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{formatDate(report.report_date)}</TableCell>
                  <TableCell>{report.customers?.company_name ?? '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{report.topic}</TableCell>
                  <TableCell>{report.status}</TableCell>
                  <TableCell>{formatDate(report.next_follow_up_date)}</TableCell>
                  <TableCell className="text-right">
                    <CallReportTableActions report={report} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No call reports yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ResponsiveTable>
      </div>

      <div className="md:hidden">
        {reports.length === 0 ? (
          <div className="text-center py-4">No call reports yet.</div>
        ) : (
          <ResponsiveCardContainer>
            {reports.map((report) => (
              <ResponsiveCard key={report.id}>
                <div className="font-medium mb-2">{report.topic}</div>
                <div className="grid grid-cols-1 gap-2">
                  <ResponsiveCardItem label="Date" value={formatDate(report.report_date)} />
                  <ResponsiveCardItem
                    label="Customer"
                    value={report.customers?.company_name ?? '—'}
                  />
                  <ResponsiveCardItem label="Status" value={report.status} />
                  <ResponsiveCardItem
                    label="Next follow-up"
                    value={formatDate(report.next_follow_up_date)}
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <CallReportTableActions report={report} />
                </div>
              </ResponsiveCard>
            ))}
          </ResponsiveCardContainer>
        )}
      </div>
    </>
  );
}

export function CallReportsPageHeader() {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold">Call Reports</h1>
      <Button asChild>
        <Link href="/call-reports/new">Add Call Report</Link>
      </Button>
    </div>
  );
}
