import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentList from "@/components/admin/DocumentList";
import type { Document } from "@/lib/types";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("documents")
    .select("*, partner:partners(company_name)")
    .eq("type", "invoice")
    .order("created_at", { ascending: false });

  const documents = (data ?? []) as (Document & { partner?: { company_name: string } })[];

  return (
    <>
      <AdminTopBar
        title="Invoices"
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <DocumentList
          type="invoice"
          documents={documents}
          newHref="/admin/invoices/new"
        />
      </main>
    </>
  );
}
