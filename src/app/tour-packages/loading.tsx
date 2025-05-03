import { DataTableSkeleton } from "@/components/data-table-skeleton";

export default function Loading() {
  return (
     <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tour Package Bookings</h1>
        {/* Placeholder for button */}
        <div className="h-10 w-44 bg-gray-200 rounded animate-pulse"></div> 
      </div>
      <DataTableSkeleton columnCount={6} /> {/* Adjust column count */} 
    </div>
  )
} 