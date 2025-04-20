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
  import type { Customer } from "@/types/database";
  import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
  import { CustomerTableActions } from "@/components/customers/customer-table-actions";

  // Helper to format date
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch {
      return "Invalid Date";
    }
  }

  export default async function CustomersPage() {
    const supabase = createSimpleServerClient();

    // Fetch customers
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, company_name, created_at')
      .order('company_name', { ascending: true })
      .returns<Customer[]>();

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Customers</h1>
          <CustomerFormDialog
            mode="add"
            triggerButton={<Button>Add New Customer</Button>}
          />
        </div>

        {error && (
          <p className="text-red-500 mb-4">Error loading customers: {error.message}</p>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of your registered customers.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers && customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.company_name}</TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <CustomerTableActions customer={customer} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  } 