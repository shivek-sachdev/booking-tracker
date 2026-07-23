import { CallReportForm } from '@/components/call-reports/call-report-form';
import { getCustomersForSelect } from '@/lib/actions/call-reports';

export default async function NewCallReportPage() {
  const customers = await getCustomersForSelect();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create Call Report</h1>
      <CallReportForm initialReport={null} customers={customers} />
    </div>
  );
}
