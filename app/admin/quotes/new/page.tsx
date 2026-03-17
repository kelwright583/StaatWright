import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Client, CompanySettings } from "@/lib/types";

interface Props {
  searchParams: Promise<{ client_id?: string }>;
}

export default async function NewQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: clientsData }, { data: settingsData }] = await Promise.all([
    supabase.from("clients").select("*").order("company_name"),
    supabase.from("company_settings").select("*").single(),
  ]);

  const clients = (clientsData ?? []) as Client[];
  const settings = settingsData as CompanySettings;

  return (
    <>
      <AdminTopBar
        title="New Quote"
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <DocumentBuilder
          type="quote"
          clients={clients}
          settings={settings}
          initialClientId={params.client_id}
        />
      </main>
    </>
  );
}
