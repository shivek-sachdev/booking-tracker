import { TrendingUp, MapPin, Crown, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTopSellingPackages, type TopSellingPackage, type TopSellingStats } from "@/lib/actions/tour-products";

export async function TopSellingPackages() {
  // Fetch real data from database
  const { packages: topPackages, stats: salesStats } = await getTopSellingPackages();

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Revenue Packages
            </CardTitle>
            <CardDescription>
              Best performing tour packages ranked by revenue
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{salesStats.totalPackagesSold}</div>
            <div className="text-xs text-muted-foreground">Total PAX</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topPackages.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-sm">#1 Package</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {salesStats.topPerformer?.name || 'No data'}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-sm text-green-600">{salesStats.monthlyGrowth}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Growth</div>
              </div>
            </div>

            {/* Top Packages List */}
            <div className="space-y-3">
              {topPackages.map((pkg, index) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{pkg.name}</h4>
                        {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{pkg.destination}</span>
                        </div>
                      </div>
                      {/* Custom Progress Bar */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${pkg.progressValue}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold text-lg text-green-600">{formatRevenue(pkg.revenue)}</div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {pkg.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales data available yet.</p>
            <p className="text-xs mt-1">Start creating tour bookings to see top revenue packages here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 