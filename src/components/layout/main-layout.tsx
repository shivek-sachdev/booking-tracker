'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Plane, 
  Ticket,
  Menu, 
  X,
  ChevronRight,
  ClipboardCheck,
  Map,
  LogOut,
  CreditCard,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { createClient } from '@/lib/supabase/client';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Standard Navigation items
  const standardNavItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { path: '/bookings', label: 'Bookings', icon: <ClipboardList className="h-4 w-4" /> },
    { path: '/customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
    { path: '/sectors', label: 'Sectors', icon: <Plane className="h-4 w-4" /> },
    { path: '/fares', label: 'Fares', icon: <Ticket className="h-4 w-4" /> },
  ];

  // Tour Package Navigation items
  const tourNavItems = [
    { path: '/tasks', label: 'Tasks', icon: <ListTodo className="h-4 w-4" /> },
    { path: '/tour-packages', label: 'Tour Bookings', icon: <ClipboardCheck className="h-4 w-4" /> },
    { path: '/tour-products', label: 'Tour Packages', icon: <Map className="h-4 w-4" /> },
  ];

  // Payment Navigation item
  const paymentNavItem = { path: '/payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {/* Mobile: Fixed, slides in/out. Desktop: Static */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gray-100 border-r dark:bg-gray-800 dark:border-gray-700 transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex justify-between items-center">
            Booking Tracker
            {/* Close button for mobile */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
              <X className="h-6 w-6" />
            </Button>
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Map Standard Items */}
          {standardNavItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
            
            return (
              <Button 
                key={item.path}
                variant={isActive ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start mb-1",
                  isActive && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                )}
                asChild
              >
                <Link href={item.path} className="flex items-center" onClick={closeMobileMenu}>
                  <span className="mr-2">{item.icon}</span> 
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </Button>
            );
          })}

          {/* Separator */}
          <Separator className="my-4" /> 

          {/* Map Tour Items */}
           {tourNavItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            
            return (
              <Button 
                key={item.path}
                variant={isActive ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start mb-1",
                  isActive && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                )}
                asChild
              >
                <Link href={item.path} className="flex items-center" onClick={closeMobileMenu}>
                  <span className="mr-2">{item.icon}</span> 
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </Button>
            );
          })}

          {/* Payments Link */}
          {(() => { // IIFE to reuse logic easily
            const item = paymentNavItem;
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Button 
                key={item.path}
                variant={isActive ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start mb-1",
                  isActive && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                )}
                asChild
              >
                <Link href={item.path} className="flex items-center" onClick={closeMobileMenu}>
                  <span className="mr-2">{item.icon}</span> 
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </Button>
            );
          })()}
        </nav>
        
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-muted-foreground">
          <span>Booking Tracker v1.0</span>
          <Button variant="ghost" size="icon" title="Logout" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-x-hidden">
        {/* Mobile Header with Menu Button */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-semibold">Booking Tracker</h1>
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 