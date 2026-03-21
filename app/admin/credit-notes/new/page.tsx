import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Partner, CompanySettings } from "@/lib/types";
import type { SimpleInvoice } from "@/components/admin/DocumentBuilder";

interface Props {
  searchParams: Promise<{ venture_id?: string; invoice_id?: string }>;
}

export default async function NewCreditNotePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: venturesData },
    { data: clientsData },
    { data: settingsData },
    { data: invoicesData },
  ] = await Promise.all([
    supabase.from("partners").select("*").eq("type", "venture").order("company_name"),
    supabase.from("partners").select("*").eq("type", "client").order("company_name"),
    supabase.from("company_settings").select("*").single(),
    supabase
      .from("documents")
      .select("id, number, partner_id, venture_id, total, status")
      .eq("type", "invoice")
      .in("status", ["sent", "paid", "overdue", "partially_paid"])
      .order("created_at", { ascending: false }),
  ]);

  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;
  const availableInvoices = (invoicesData ?? []) as SimpleInvoice[];

  return (
    <>
      <AdminTopBar title="New Credit Note" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8">
        <DocumentBuilder
          type="credit_note"
          ventures={ventures}
          clients={clients}
          settings={settings}
          availableInvoices={availableInvoices}
          initialVentureId={params.venture_id}
        />
      </main>
    </>
  );
}
