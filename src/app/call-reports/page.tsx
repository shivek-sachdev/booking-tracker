import { getCallReports } from '@/lib/actions/call-reports';
import { CallReportsPageHeader, CallReportsTable } from '@/components/call-reports/call-reports-table';

export default async function CallReportsPage() {
  const reports = await getCallReports();

  return (
    <div>
      <CallReportsPageHeader />
      <CallReportsTable reports={reports} />
    </div>
  );
}
