import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import LinkedInvoice from "@/components/admin/LinkedInvoice";
import type { Document, Partner, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreditNoteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: docData }, { data: clientsData }, { data: settingsData }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("partners").select("*").order("company_name"),
      supabase.from("company_settings").select("*").single(),
    ]);

  if (!docData || docData.type !== "credit_note") notFound();

  const doc = docData as Document;
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;

  // Detect whether linked_document_id column exists yet (graceful degradation)
  const columnExists = "linked_document_id" in doc;
  const linkedDocumentId = columnExists
    ? (doc as Document & { linked_document_id?: string | null }).linked_document_id ?? null
    : undefined;

  return (
    <>
      <AdminTopBar
        title={`Credit Note ${doc.number}`}
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8 space-y-6">
        <DocumentBuilder
          type="credit_note"
          initialDoc={doc}
          clients={clients}
          settings={settings}
        />

        <div className="max-w-3xl">
          <LinkedInvoice
            creditNoteId={doc.id}
            currentLinkedInvoiceId={linkedDocumentId}
            columnExists={columnExists}
          />
        </div>
      </main>
    </>
  );
}
