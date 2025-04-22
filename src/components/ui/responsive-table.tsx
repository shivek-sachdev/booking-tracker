"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  caption?: string;
}

// Wrapper component for responsive tables
export function ResponsiveTable({
  children,
  caption,
  className,
  ...props
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        "w-full rounded-md border overflow-hidden mb-4",
        className
      )}
      {...props}
    >
      <div className="overflow-auto">
        <Table>{children}</Table>
      </div>

      {caption && (
        <div className="py-2 px-4 text-sm text-muted-foreground bg-muted/20">
          {caption}
        </div>
      )}
    </div>
  );
}

// Card view for mobile displays
export function ResponsiveCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm p-4 mb-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Item in the card, displaying a label and value
export function ResponsiveCardItem({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col py-1", className)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{value}</div>
    </div>
  );
}

// Collection of cards
export function ResponsiveCardContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("space-y-3", className)}
      {...props}
    >
      {children}
    </div>
  );
} 