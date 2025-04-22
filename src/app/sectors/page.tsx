import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Button } from "@/components/ui/button";
  import { createSimpleServerClient } from "@/lib/supabase/server";
  import type { PredefinedSector } from "@/types/database";
  import { SectorFormDialog } from "@/components/sectors/sector-form-dialog";
  import { SectorTableActions } from "@/components/sectors/sector-table-actions";
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
      return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch {
      return "Invalid Date";
    }
  }

  export default async function SectorsPage() {
    const supabase = createSimpleServerClient();

    // Fetch predefined sectors
    const { data: sectors, error } = await supabase
      .from('predefined_sectors')
      .select('id, origin_code, destination_code, description, created_at')
      .order('origin_code', { ascending: true })
      .order('destination_code', { ascending: true })
      .returns<PredefinedSector[]>();

    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Predefined Sectors</h1>
          <SectorFormDialog
            mode="add"
            triggerButton={<Button className="w-full sm:w-auto">Add New Sector</Button>}
          />
        </div>

        {error && (
          <p className="text-red-500 mb-4">Error loading sectors: {error.message}</p>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <ResponsiveTable caption="A list of your predefined flight sectors.">
            <TableHeader>
              <TableRow>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors && sectors.length > 0 ? (
                sectors.map((sector) => (
                  <TableRow key={sector.id}>
                    <TableCell>{sector.origin_code}</TableCell>
                    <TableCell>{sector.destination_code}</TableCell>
                    <TableCell>{sector.description || '-'}</TableCell>
                    <TableCell>{formatDate(sector.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <SectorTableActions sector={sector} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No predefined sectors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </ResponsiveTable>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {!sectors || sectors.length === 0 ? (
            <div className="text-center py-4">No predefined sectors found.</div>
          ) : (
            <ResponsiveCardContainer>
              {sectors.map((sector) => (
                <ResponsiveCard key={sector.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-lg font-medium">
                      {sector.origin_code} - {sector.destination_code}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <ResponsiveCardItem 
                      label="Description" 
                      value={sector.description || '-'}
                    />
                    <ResponsiveCardItem 
                      label="Created At" 
                      value={formatDate(sector.created_at)}
                    />
                  </div>

                  <div className="flex justify-end mt-4">
                    <SectorTableActions sector={sector} />
                  </div>
                </ResponsiveCard>
              ))}
            </ResponsiveCardContainer>
          )}
        </div>
      </div>
    );
  } 