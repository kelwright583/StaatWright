import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import PartialPayments from "@/components/admin/PartialPayments";
import type { Document, Partner, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

const PAYMENT_STATUSES = ["sent", "overdue", "partially_paid"];

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: docData }, { data: partnersData }, { data: settingsData }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("partners").select("*").order("company_name"),
      supabase.from("company_settings").select("*").single(),
    ]);

  if (!docData || docData.type !== "invoice") notFound();

  const doc = docData as Document;
  const partners = (partnersData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;

  const showPayments = PAYMENT_STATUSES.includes(doc.status);

  // Multi-currency
  const currency = (doc as Document & { currency?: string | null }).currency;
  const showCurrencyBadge = !!currency && currency !== "ZAR";

  return (
    <>
      <AdminTopBar
        title={`Invoice ${doc.number}`}
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8 space-y-6">
        {/* Currency badge — shown when invoice is non-ZAR */}
        {showCurrencyBadge && (
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-medium px-2.5 py-1 border border-[#5C6E81] text-[#5C6E81] bg-[#F3F2EE] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              {currency} Invoice
            </span>
          </div>
        )}

        <DocumentBuilder
          type="invoice"
          initialDoc={doc}
          partners={partners}
          settings={settings}
        />

        {showPayments && (
          <div className="max-w-3xl">
            <PartialPayments
              documentId={doc.id}
              invoiceTotal={doc.total ?? 0}
              currency={currency}
            />
          </div>
        )}
      </main>
    </>
  );
}
