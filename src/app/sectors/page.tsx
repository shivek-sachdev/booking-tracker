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

  // Helper to format date
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch (e) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Predefined Sectors</h1>
          <SectorFormDialog
            mode="add"
            triggerButton={<Button>Add New Sector</Button>}
          />
        </div>

        {error && (
          <p className="text-red-500 mb-4">Error loading sectors: {error.message}</p>
        )}

        <Table>
          <TableCaption>A list of your predefined flight sectors.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID (UUID)</TableHead>
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
                  <TableCell className="font-medium truncate" title={sector.id}>
                     {sector.id.substring(0, 8)}...
                  </TableCell>
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
                <TableCell colSpan={6} className="text-center">
                  No predefined sectors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  } 