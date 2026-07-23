import { notFound } from 'next/navigation';
import { CallReportForm } from '@/components/call-reports/call-report-form';
import { getCallReportById, getCustomersForSelect } from '@/lib/actions/call-reports';

export default async function EditCallReportPage(props: {
  params: Promise<{ id: string }> | undefined;
}) {
  if (!props.params) {
    notFound();
  }

  const { id } = await props.params;
  const [report, customers] = await Promise.all([
    getCallReportById(id),
    getCustomersForSelect(),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Edit Call Report</h1>
      <CallReportForm initialReport={report} customers={customers} />
    </div>
  );
}
