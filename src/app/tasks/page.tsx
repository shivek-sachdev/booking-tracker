import { ArrowUpRight, Calendar, Package, CreditCard, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsSummary } from '@/components/tasks/stats-summary';
import { TopSellingPackages } from '@/components/tasks/top-selling-packages';
import { getTourBookingsStats, getTourPackagesStats, getPaymentsStats } from '@/lib/actions/dashboard-stats';
import { getTasks } from '@/lib/actions/tasks';

// Optional: Revalidate this page periodically or on demand
// export const revalidate = 60; // Revalidate every 60 seconds
// export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function TasksPage() {
  // Fetch real data from database
  const tourBookingsStats = await getTourBookingsStats();
  const tourPackagesStats = await getTourPackagesStats();
  const paymentsStats = await getPaymentsStats();
  
  // Fetch real tasks data and get the 4 most recent ones
  const allTasks = await getTasks({ sortBy: 'created_at', ascending: false });
  const recentTasks = allTasks.slice(0, 4);

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tasks Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild size="sm">
          <Link href="/tasks/new">
              <Activity className="mr-2 h-4 w-4" />
              New Task
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
      
      {/* Bottom Section with Top Selling Packages and Recent Tasks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Selling Packages - Takes up more space */}
        <div className="lg:col-span-4">
          <TopSellingPackages />
        </div>

        {/* Recent Tasks */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Tasks
                </CardTitle>
                <CardDescription>Your latest tasks and activities</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/tasks/all">View All Tasks</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm font-medium leading-none ${
                      /[\u0E00-\u0E7F]/.test(task.description) ? 'thai-text' : ''
                    }`}>
                      {task.description}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(task.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge 
                      variant={task.status === 'Completed' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent tasks found.</p>
                <p className="text-xs mt-1">Create your first task to see it here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 