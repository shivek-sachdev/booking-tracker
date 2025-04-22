"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function DashboardCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  ...props
}: DashboardCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span 
              className={cn(
                "text-xs ml-2 flex items-center", 
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Progress bar component
interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string; 
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className, 
  indicatorClassName 
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={cn("w-full h-2 bg-gray-200 rounded-full", className)}>
      <div 
        className={cn("h-full rounded-full bg-blue-600", indicatorClassName)} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Item with label, value and optional progress bar
interface MetricItemProps {
  label: string;
  value: React.ReactNode;
  secondaryValue?: React.ReactNode;
  progress?: number;
  maxProgress?: number;
  progressColor?: string;
  className?: string;
}

export function MetricItem({ 
  label, 
  value, 
  secondaryValue,
  progress, 
  maxProgress,
  progressColor,
  className 
}: MetricItemProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-center">
        <span className="text-xs truncate">{label}</span>
        <div className="flex items-center">
          <span className="text-xs font-medium">{value}</span>
          {secondaryValue && (
            <span className="text-xs text-muted-foreground ml-1">
              ({secondaryValue})
            </span>
          )}
        </div>
      </div>
      {typeof progress !== 'undefined' && (
        <ProgressBar 
          value={progress} 
          max={maxProgress} 
          className="h-1" 
          indicatorClassName={progressColor}
        />
      )}
    </div>
  );
} 