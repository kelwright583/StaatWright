import { notFound } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import LinkedInvoice from "@/components/admin/LinkedInvoice";
import type { Document, Partner, CompanySettings } from "@/lib/types";
import type { SimpleInvoice } from "@/components/admin/DocumentBuilder";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreditNoteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getSessionUser();

  const [
    { data: docData },
    { data: venturesData },
    { data: clientsData },
    { data: settingsData },
    { data: invoicesData },
  ] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
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

  if (!docData || docData.type !== "credit_note") notFound();

  const doc = docData as Document;
  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;
  const availableInvoices = (invoicesData ?? []) as SimpleInvoice[];

  const linkedDocumentId = doc.linked_document_id ?? null;

  return (
    <>
      <AdminTopBar title={`Credit Note ${doc.number}`} user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8 space-y-6">
        <DocumentBuilder
          type="credit_note"
          initialDoc={doc}
          ventures={ventures}
          clients={clients}
          settings={settings}
          availableInvoices={availableInvoices}
        />

        <div className="max-w-3xl">
          <LinkedInvoice
            creditNoteId={doc.id}
            currentLinkedInvoiceId={linkedDocumentId}
            columnExists={true}
          />
        </div>
      </main>
    </>
  );
}
