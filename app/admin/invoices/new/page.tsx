import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Partner, CompanySettings } from "@/lib/types";
import type { SimpleQuote } from "@/components/admin/DocumentBuilder";

interface Props {
  searchParams: Promise<{ venture_id?: string; partner_id?: string; client_id?: string }>;
}

export default async function NewInvoicePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: venturesData },
    { data: clientsData },
    { data: settingsData },
    { data: quotesData },
  ] = await Promise.all([
    supabase.from("partners").select("*").eq("type", "venture").order("company_name"),
    supabase.from("partners").select("*").eq("type", "client").order("company_name"),
    supabase.from("company_settings").select("*").single(),
    supabase
      .from("documents")
      .select("id, number, partner_id, venture_id, line_items, subtotal, total")
      .eq("type", "quote")
      .eq("status", "accepted")
      .order("created_at", { ascending: false }),
  ]);

  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;
  const acceptedQuotes = (quotesData ?? []) as SimpleQuote[];

  return (
    <>
      <AdminTopBar title="New Invoice" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8">
        <DocumentBuilder
          type="invoice"
          ventures={ventures}
          clients={clients}
          settings={settings}
          acceptedQuotes={acceptedQuotes}
          initialVentureId={params.venture_id}
          initialClientId={params.partner_id ?? params.client_id}
        />
      </main>
    </>
  );
}
