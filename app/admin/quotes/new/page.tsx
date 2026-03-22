import { createClient, getSessionUser } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Partner, CompanySettings } from "@/lib/types";

interface Props {
  searchParams: Promise<{ venture_id?: string; partner_id?: string; client_id?: string }>;
}

export default async function NewQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const user = await getSessionUser();

  const [{ data: venturesData }, { data: clientsData }, { data: settingsData }] = await Promise.all([
    supabase.from("partners").select("*").eq("type", "venture").order("company_name"),
    supabase.from("partners").select("*").eq("type", "client").order("company_name"),
    supabase.from("company_settings").select("*").single(),
  ]);

  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;

  return (
    <>
      <AdminTopBar title="New Quote" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8">
        <DocumentBuilder
          type="quote"
          ventures={ventures}
          clients={clients}
          settings={settings}
          initialVentureId={params.venture_id}
          initialClientId={params.partner_id ?? params.client_id}
        />
      </main>
    </>
  );
}
