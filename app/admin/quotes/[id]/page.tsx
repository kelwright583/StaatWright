import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import ConvertToInvoice from "@/components/admin/ConvertToInvoice";
import type { Document, Partner, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: docData },
    { data: venturesData },
    { data: clientsData },
    { data: settingsData },
  ] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("partners").select("*").eq("type", "venture").order("company_name"),
    supabase.from("partners").select("*").eq("type", "client").order("company_name"),
    supabase.from("company_settings").select("*").single(),
  ]);

  if (!docData || docData.type !== "quote") notFound();

  const doc = docData as Document;
  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;

  const showConvert = doc.status === "accepted" || doc.status === "sent";

  return (
    <>
      <AdminTopBar title={`Quote ${doc.number}`} user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8 space-y-4">
        {showConvert && (
          <div className="flex justify-end">
            <div className="w-72">
              <ConvertToInvoice quote={doc} settings={settings} />
            </div>
          </div>
        )}

        <DocumentBuilder
          type="quote"
          initialDoc={doc}
          ventures={ventures}
          clients={clients}
          settings={settings}
        />
      </main>
    </>
  );
}
