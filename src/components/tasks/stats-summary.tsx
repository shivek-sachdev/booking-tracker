import { DollarSign, Calendar, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/actions/dashboard-stats";

export async function StatsSummary() {
  // Fetch real data from database
  const stats = await getDashboardStats();

  // Format revenue for display
  const formatRevenue = (revenue: number): string => {
    if (revenue >= 1000000) {
      return `฿${(revenue / 1000000).toFixed(2)}M`;
    } else if (revenue >= 1000) {
      return `฿${(revenue / 1000).toFixed(0)}K`;
    } else {
      return `฿${revenue.toLocaleString()}`;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatRevenue(stats.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{stats.revenueChange}</span> from last month
          </p>
          <p className="text-xs text-muted-foreground mt-1">Monthly revenue growth</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeBookings}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{stats.bookingsChange}</span> from last month
          </p>
          <p className="text-xs text-muted-foreground mt-1">Currently active bookings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{stats.customersChange}</span> from last month
          </p>
          <p className="text-xs text-muted-foreground mt-1">Registered customers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{stats.completionChange}</span> from last month
          </p>
          <p className="text-xs text-muted-foreground mt-1">Tour completion rate</p>
        </CardContent>
      </Card>
    </div>
  );
} 