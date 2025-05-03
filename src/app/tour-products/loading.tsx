import { DataTableSkeleton } from "@/components/data-table-skeleton"; // Assuming shared skeleton

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
     <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tour Products</h1>
        {/* Placeholder for button */}
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <DataTableSkeleton columnCount={3} />
    </div>
  )
} 