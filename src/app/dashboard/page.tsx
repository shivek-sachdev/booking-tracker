import { ArrowUpRight, Calendar, Package, CreditCard, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsSummary } from '@/components/tasks/stats-summary';
import { TopSellingPackages } from '@/components/tasks/top-selling-packages';
import { getTourBookingsStats, getTourPackagesStats, getPaymentsStats } from '@/lib/actions/dashboard-stats';

// Optional: Revalidate this page periodically or on demand
// export const revalidate = 60; // Revalidate every 60 seconds
// export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function DashboardPage() {
  // Fetch real data from database
  const tourBookingsStats = await getTourBookingsStats();
  const tourPackagesStats = await getTourPackagesStats();
  const paymentsStats = await getPaymentsStats();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild size="sm">
            <Link href="/tour-packages/new">
              <BarChart3 className="mr-2 h-4 w-4" />
              Quick Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <StatsSummary />

      {/* Main Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Tour Bookings Card */}
        <Link href="/tour-packages">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tour Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tourBookingsStats.total}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{tourBookingsStats.change}</span> from last month
              </p>
              <div className="flex justify-between items-center mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourBookingsStats.confirmed} Confirmed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourBookingsStats.pending} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourBookingsStats.cancelled} Cancelled
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Tour Packages Card */}
        <Link href="/tour-products">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tour Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tourPackagesStats.total}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{tourPackagesStats.change}</span> from last month
              </p>
              <div className="flex justify-between items-center mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourPackagesStats.active} Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourPackagesStats.draft} Draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {tourPackagesStats.archived} Archived
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Payments Card */}
        <Link href="/payments">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentsStats.total}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{paymentsStats.change}</span> from last month
              </p>
              <div className="flex justify-between items-center mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {paymentsStats.completed} Completed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {paymentsStats.pending} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      {paymentsStats.failed} Failed
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Top Selling Packages - Full width */}
      <div className="grid gap-4">
        <TopSellingPackages />
      </div>
    </div>
  );
} 