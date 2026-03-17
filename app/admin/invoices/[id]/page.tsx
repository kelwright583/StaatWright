import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import type { Document, Client, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: docData }, { data: clientsData }, { data: settingsData }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("clients").select("*").order("company_name"),
      supabase.from("company_settings").select("*").single(),
    ]);

  if (!docData || docData.type !== "invoice") notFound();

  const doc = docData as Document;
  const clients = (clientsData ?? []) as Client[];
  const settings = settingsData as CompanySettings;

  return (
    <>
      <AdminTopBar
        title={`Invoice ${doc.number}`}
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <DocumentBuilder
          type="invoice"
          initialDoc={doc}
          clients={clients}
          settings={settings}
        />
      </main>
    </>
  );
}
