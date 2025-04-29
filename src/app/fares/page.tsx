import { createSimpleServerClient } from "@/lib/supabase/server";
import type { FareClass } from "@/types/database";
import { PostgrestError } from "@supabase/supabase-js";
import { 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FareClassDialog } from "@/components/fares/fare-class-dialog";
import { FareTableActions } from "@/components/fares/fare-table-actions"; // Import actions
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns'; 
import { 
  ResponsiveTable, 
  ResponsiveCard, 
  ResponsiveCardItem,
  ResponsiveCardContainer 
} from "@/components/ui/responsive-table";

// Helper to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), 'PPp'); 
  } catch {
    return "Invalid Date";
  }
}

export default async function FaresPage() {
  const supabase = createSimpleServerClient();

  const { data: fareClasses, error } = await supabase
    .from('fare_classes')
    .select('id, name, description, created_at, updated_at')
    .order('name', { ascending: true })
    .returns<FareClass[]>();

  if (error) {
    const errorMessage = (error as PostgrestError).message ?? 'Unknown error';
    console.error("Error fetching fare classes:", errorMessage);
    return (
      <div className="p-4">
         <h1 className="text-2xl font-semibold mb-4">Fares</h1>
         <p className="text-red-500">Error loading fare classes: {errorMessage}</p>
      </div>
    );
  }

  return (
    <div> 
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Fares</h1>
        <FareClassDialog
          mode="add"
          triggerButton={
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Fare Class
            </Button>
          }
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <ResponsiveTable caption="A list of your defined fare classes.">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fareClasses && fareClasses.length > 0 ? (
              fareClasses.map((fc) => (
                <TableRow key={fc.id}>
                  <TableCell className="font-medium">{fc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fc.description || '-'} 
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(fc.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                     <FareTableActions fareClass={fc} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No fare classes found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ResponsiveTable>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        {!fareClasses || fareClasses.length === 0 ? (
          <div className="text-center py-4">No fare classes found.</div>
        ) : (
          <ResponsiveCardContainer>
            {fareClasses.map((fc) => (
              <ResponsiveCard key={fc.id}>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-lg font-medium">
                    {fc.name}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <ResponsiveCardItem 
                    label="Description" 
                    value={fc.description || '-'}
                  />
                  <ResponsiveCardItem 
                    label="Last Updated" 
                    value={formatDate(fc.updated_at)}
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <FareTableActions fareClass={fc} />
                </div>
              </ResponsiveCard>
            ))}
          </ResponsiveCardContainer>
        )}
      </div>
    </div>
  );
} 