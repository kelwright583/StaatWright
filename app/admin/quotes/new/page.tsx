import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Partner, CompanySettings } from "@/lib/types";

interface Props {
  searchParams: Promise<{ client_id?: string; partner_id?: string }>;
}

export default async function NewQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: partnersData }, { data: settingsData }] = await Promise.all([
    supabase.from("partners").select("*").order("company_name"),
    supabase.from("company_settings").select("*").single(),
  ]);

  const partners = (partnersData ?? []) as Partner[];
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
          partners={partners}
          settings={settings}
          initialPartnerId={params.partner_id ?? params.client_id}
        />
      </main>
    </>
  );
}
