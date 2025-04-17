import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 p-4 border-r dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-6">Booking Tracker</h2>
        <nav className="flex flex-col space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/bookings">Bookings</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/customers">Customers</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/sectors">Sectors</Link>
          </Button>
          {/* Add more links as needed */}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-white dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
} 