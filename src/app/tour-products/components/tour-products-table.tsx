'use client';

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

import { type TourProduct } from "@/lib/types/tours";
import { deleteTourProduct } from "@/lib/actions/tour-products";
import { TourPackageFormDialog } from './tour-package-form-dialog';

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString); // Already a string from DB
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid Date';
  }
};

// Reusable Delete Confirmation Dialog
const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  bookingInfo
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  bookingInfo: string;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the tour package "{bookingInfo}".
          If this package is linked to existing bookings, deletion might fail.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Define Actions Cell Component Separately
const ActionsCell = ({
  product,
  onDataRefresh
}: {
  product: TourProduct;
  onDataRefresh: () => void;
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTourProduct(product.id);
      if (result.message.startsWith('Success')) {
        toast.success(result.message);
        setIsDeleteDialogOpen(false);
        onDataRefresh();
      } else {
        toast.error(result.message); 
      }
    } catch {
      toast.error("An unexpected error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <TourPackageFormDialog 
            mode="edit"
            initialProduct={product}
            onSuccess={onDataRefresh}
            triggerButton={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                 <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)} 
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            disabled={isDeleting}
          >
              <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          bookingInfo={`Tour Product: ${product.name}`}
      />
    </>
  );
}

// --- Table Component accepting props (Restored) --- 
interface TourProductsTableProps {
  data: TourProduct[];
  onDataRefresh: () => void; // Keep this prop
}

export function TourProductsTable({ data, onDataRefresh }: TourProductsTableProps) { // Restored props
  const headers = [
    'Name', 
    'Description', 
    'Last Updated', 
    'Actions'
  ];

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Use the data prop */}
            {data.length > 0 ? (
              data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{product.description || '-'}</TableCell>
                  <TableCell>{formatDate(product.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    {/* Pass onDataRefresh to ActionsCell */} 
                    <ActionsCell product={product} onDataRefresh={onDataRefresh} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} className="h-24 text-center">
                  No products found. Why not create one?
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 