import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CallReportAddUpdateDialog } from '@/components/call-reports/call-report-add-update-dialog';
import { CallReportProgressTimeline } from '@/components/call-reports/call-report-progress-timeline';
import { formatDate } from '@/lib/utils/formatting';
import type { CallReportUpdate, CallReportWithCustomer } from '@/lib/types/call-reports';

interface CallReportDetailProps {
  report: CallReportWithCustomer;
  updates: CallReportUpdate[];
}

export function CallReportDetail({ report, updates }: CallReportDetailProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{report.topic}</h1>
          <p className="text-muted-foreground mt-1">
            {report.customers?.company_name ?? '—'}
            {report.contact_person ? ` · ${report.contact_person}` : ''}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Visit date: {formatDate(report.report_date)} · Status: {report.status}
            {report.next_follow_up_date
              ? ` · Next follow-up: ${formatDate(report.next_follow_up_date)}`
              : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/call-reports">Back to list</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/call-reports/${report.id}/edit`}>Edit original visit</Link>
          </Button>
          <CallReportAddUpdateDialog report={report} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Progress</h2>
        {updates.length === 0 ? (
          <p className="text-muted-foreground text-sm mb-4">
            No follow-up updates yet. Use Add update above when you have progress to log.
          </p>
        ) : null}
        <CallReportProgressTimeline report={report} updates={updates} />
      </div>
    </div>
  );
}
