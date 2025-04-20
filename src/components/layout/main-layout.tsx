'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ClipboardList, Users, Plane, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {/* Mobile: Fixed, slides in/out. Desktop: Static */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gray-100 p-4 border-r dark:bg-gray-800 dark:border-gray-700 transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <h2 className="text-xl font-semibold mb-6 flex justify-between items-center">
          Booking Tracker
          {/* Close button for mobile */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
            <X className="h-6 w-6" />
          </Button>
        </h2>
        <nav className="flex flex-col space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/" className="flex items-center" onClick={closeMobileMenu}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/bookings" className="flex items-center" onClick={closeMobileMenu}><ClipboardList className="mr-2 h-4 w-4" /> Bookings</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/customers" className="flex items-center" onClick={closeMobileMenu}><Users className="mr-2 h-4 w-4" /> Customers</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/sectors" className="flex items-center" onClick={closeMobileMenu}><Plane className="mr-2 h-4 w-4" /> Sectors</Link>
          </Button>
          {/* Add more links as needed */}
        </nav>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-white dark:bg-gray-900">
        {/* Mobile Header with Menu Button */}
        <div className="md:hidden flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Booking Tracker</h1>
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
} 