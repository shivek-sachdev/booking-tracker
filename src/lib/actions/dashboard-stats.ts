'use server';

import { createSimpleServerClient } from '@/lib/supabase/server';

// --- Types for Dashboard Stats ---
export interface DashboardStats {
  totalRevenue: number;
  revenueChange: string;
  activeBookings: number;
  bookingsChange: string;
  totalCustomers: number;
  customersChange: string;
  completionRate: number;
  completionChange: string;
}

export interface TourBookingsStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  change: string;
}

export interface TourPackagesStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  change: string;
}

export interface PaymentsStats {
  total: string;
  completed: string;
  pending: string;
  failed: string;
  change: string;
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
  failedAmount: number;
}

// --- GET DASHBOARD STATS ---
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createSimpleServerClient();

  try {
    // Get tour package bookings for revenue and bookings stats
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('tour_package_bookings')
      .select('grand_total, status, customer_name, created_at');

    if (bookingsError) {
      console.error('Error fetching bookings data:', bookingsError);
    }

    // Get unique customers count
    const uniqueCustomers = new Set(bookingsData?.map(b => b.customer_name.toLowerCase().trim()) || []);
    
    // Calculate revenue
    const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.grand_total || 0), 0) || 0;
    
    // Calculate active bookings (Open, Negotiating, Paid statuses)
    const activeStatuses = ['Open', 'Negotiating', 'Paid (1st installment)', 'Paid (Full Payment)'];
    const activeBookings = bookingsData?.filter(b => activeStatuses.includes(b.status)).length || 0;
    
    // Calculate completion rate (Complete status vs total)
    const completedBookings = bookingsData?.filter(b => b.status === 'Complete').length || 0;
    const totalBookings = bookingsData?.length || 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    // For now, set changes to 0% since we don't have historical data
    // In the future, you can implement actual historical comparison
    const revenueChange = "0%";
    const bookingsChange = "0%";
    const customersChange = "0%";
    const completionChange = "0%";

    return {
      totalRevenue,
      revenueChange,
      activeBookings,
      bookingsChange,
      totalCustomers: uniqueCustomers.size,
      customersChange,
      completionRate: Number(completionRate.toFixed(1)),
      completionChange
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalRevenue: 0,
      revenueChange: "0%",
      activeBookings: 0,
      bookingsChange: "0%",
      totalCustomers: 0,
      customersChange: "0%",
      completionRate: 0,
      completionChange: "0%"
    };
  }
}

// --- GET TOUR BOOKINGS STATS ---
export async function getTourBookingsStats(): Promise<TourBookingsStats> {
  const supabase = createSimpleServerClient();

  try {
    const { data: bookingsData, error } = await supabase
      .from('tour_package_bookings')
      .select('status');

    if (error) {
      console.error('Error fetching tour bookings stats:', error);
      return { total: 0, confirmed: 0, pending: 0, cancelled: 0, change: "0%" };
    }

    const total = bookingsData?.length || 0;
    const confirmed = bookingsData?.filter(b => 
      ['Paid (Full Payment)', 'Complete'].includes(b.status)
    ).length || 0;
    const pending = bookingsData?.filter(b => 
      ['Open', 'Negotiating', 'Paid (1st installment)'].includes(b.status)
    ).length || 0;
    const cancelled = bookingsData?.filter(b => b.status === 'Closed').length || 0;

    return {
      total,
      confirmed,
      pending,
      cancelled,
      change: "0%" // Set to 0% since we don't have historical data
    };

  } catch (error) {
    console.error('Error fetching tour bookings stats:', error);
    return { total: 0, confirmed: 0, pending: 0, cancelled: 0, change: "0%" };
  }
}

// --- GET TOUR PACKAGES STATS ---
export async function getTourPackagesStats(): Promise<TourPackagesStats> {
  const supabase = createSimpleServerClient();

  try {
    const { data: productsData, error } = await supabase
      .from('tour_products')
      .select('id, name, created_at');

    if (error) {
      console.error('Error fetching tour packages stats:', error);
      return { total: 0, active: 0, draft: 0, archived: 0, change: "0%" };
    }

    const total = productsData?.length || 0;
    
    // Check which products have bookings (active)
    const { data: bookingsData } = await supabase
      .from('tour_package_bookings')
      .select('tour_product_id');

    const activeProductIds = new Set(bookingsData?.map(b => b.tour_product_id) || []);
    const active = productsData?.filter(p => activeProductIds.has(p.id)).length || 0;
    
    // For now, consider products without bookings as draft
    const draft = total - active;
    const archived = 0; // Would need a status field in tour_products to track this

    return {
      total,
      active,
      draft,
      archived,
      change: "0%" // Set to 0% since we don't have historical data
    };

  } catch (error) {
    console.error('Error fetching tour packages stats:', error);
    return { total: 0, active: 0, draft: 0, archived: 0, change: "0%" };
  }
}

// --- GET PAYMENTS STATS ---
export async function getPaymentsStats(): Promise<PaymentsStats> {
  const supabase = createSimpleServerClient();

  try {
    // Get all tour package bookings with their payment status
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('tour_package_bookings')
      .select('grand_total, status');

    if (bookingsError) {
      console.error('Error fetching payments stats:', bookingsError);
    }

    const totalAmount = bookingsData?.reduce((sum, booking) => sum + (booking.grand_total || 0), 0) || 0;
    
    // Calculate completed payments (bookings with Full Payment or Complete status)
    const completedAmount = bookingsData?.filter(b => 
      ['Paid (Full Payment)', 'Complete'].includes(b.status)
    ).reduce((sum, booking) => sum + (booking.grand_total || 0), 0) || 0;

    // Calculate pending payments (bookings with other statuses)
    const pendingAmount = bookingsData?.filter(b => 
      ['Open', 'Negotiating', 'Paid (1st installment)'].includes(b.status)
    ).reduce((sum, booking) => sum + (booking.grand_total || 0), 0) || 0;

    // Failed payments (closed bookings)
    const failedAmount = bookingsData?.filter(b => b.status === 'Closed')
      .reduce((sum, booking) => sum + (booking.grand_total || 0), 0) || 0;

    // Format amounts
    const formatAmount = (amount: number): string => {
      if (amount >= 1000000) {
        return `฿${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `฿${(amount / 1000).toFixed(0)}K`;
      } else {
        return `฿${amount.toLocaleString()}`;
      }
    };

    return {
      total: formatAmount(totalAmount),
      completed: formatAmount(completedAmount),
      pending: formatAmount(pendingAmount),
      failed: formatAmount(failedAmount),
      change: "0%", // Set to 0% since we don't have historical data
      totalAmount,
      completedAmount,
      pendingAmount,
      failedAmount
    };

  } catch (error) {
    console.error('Error fetching payments stats:', error);
    return {
      total: "฿0",
      completed: "฿0",
      pending: "฿0",
      failed: "฿0",
      change: "0%",
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      failedAmount: 0
    };
  }
} 