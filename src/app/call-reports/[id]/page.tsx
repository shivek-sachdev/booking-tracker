import { notFound } from 'next/navigation';
import { CallReportDetail } from '@/components/call-reports/call-report-detail';
import { getCallReportById, getCallReportUpdates } from '@/lib/actions/call-reports';

export default async function CallReportDetailPage(props: {
  params: Promise<{ id: string }> | undefined;
}) {
  if (!props.params) {
    notFound();
  }

  const { id } = await props.params;
  const [report, updates] = await Promise.all([
    getCallReportById(id),
    getCallReportUpdates(id),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <CallReportDetail report={report} updates={updates} />
    </div>
  );
}
