import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentBuilder from "@/components/admin/DocumentBuilder";
import PartialPayments from "@/components/admin/PartialPayments";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";
import type { Document, Partner, CompanySettings } from "@/lib/types";
import type { SimpleQuote } from "@/components/admin/DocumentBuilder";

interface Props {
  params: Promise<{ id: string }>;
}

const PAYMENT_STATUSES = ["sent", "overdue", "partially_paid"];

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getSessionUser();

  const [
    { data: docData },
    { data: venturesData },
    { data: clientsData },
    { data: settingsData },
    { data: paymentsData },
  ] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("partners").select("*").eq("type", "venture").order("company_name"),
    supabase.from("partners").select("*").eq("type", "client").order("company_name"),
    supabase.from("company_settings").select("*").single(),
    supabase.from("invoice_payments").select("amount").eq("document_id", id),
  ]);

  if (!docData || docData.type !== "invoice") notFound();

  const doc = docData as Document;
  const ventures = (venturesData ?? []) as Partner[];
  const clients = (clientsData ?? []) as Partner[];
  const settings = settingsData as CompanySettings;

  const docClient = clients.find((p) => p.id === doc.partner_id) ?? null;
  const showSendButton = doc.status === "draft";
  const showPayments = PAYMENT_STATUSES.includes(doc.status);

  const currency = doc.currency;
  const showCurrencyBadge = !!currency && currency !== "ZAR";

  // Accepted quotes for this invoice's client (to allow linking)
  const { data: quotesData } = await supabase
    .from("documents")
    .select("id, number, partner_id, venture_id, line_items, subtotal, total")
    .eq("type", "quote")
    .eq("status", "accepted")
    .order("created_at", { ascending: false });
  const acceptedQuotes = (quotesData ?? []) as SimpleQuote[];

  // Linked credit notes
  const { data: linkedCreditNotes, error: cnError } = await supabase
    .from("documents")
    .select("id, number, total, status")
    .eq("type", "credit_note")
    .eq("linked_document_id", id);

  const creditNotes = (cnError ? [] : (linkedCreditNotes ?? [])) as {
    id: string; number: string; total: number | null; status: string;
  }[];

  const totalPaid = (paymentsData ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0
  );
  const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + (cn.total ?? 0), 0);
  const effectiveBalance = (doc.total ?? 0) - totalPaid - totalCreditNotes;

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
          ventures={ventures}
          clients={clients}
          settings={settings}
          acceptedQuotes={acceptedQuotes}
        />

        {showSendButton && (
          <div className="max-w-xs">
            <SendInvoiceButton
              documentId={doc.id}
              invoiceNumber={doc.number}
              partnerEmail={docClient?.email ?? null}
              partnerName={docClient?.company_name ?? null}
              total={doc.total ?? 0}
            />
          </div>
        )}

        {showPayments && (
          <div className="max-w-3xl">
            <PartialPayments
              documentId={doc.id}
              invoiceTotal={doc.total ?? 0}
              currency={currency}
            />
          </div>
        )}

        {/* Credit Notes section */}
        {!cnError && (
          <div
            className="max-w-3xl bg-white border border-[#EAE4DC] p-6 space-y-4"
            style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            <p className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
              Credit Notes Applied
            </p>

            {creditNotes.length === 0 ? (
              <p className="text-sm text-[#5C6E81] italic">No credit notes linked to this invoice.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                      <th className="text-left px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Credit Note #</th>
                      <th className="text-left px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                      <th className="text-right px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Amount</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map((cn) => (
                      <tr key={cn.id} className="border-b border-[#EAE4DC] last:border-0">
                        <td className="px-3 py-2 text-[#1A1A1A] font-medium">{cn.number}</td>
                        <td className="px-3 py-2 text-[#5C6E81] capitalize">{cn.status}</td>
                        <td className="px-3 py-2 text-right text-[#1A1A1A] whitespace-nowrap">
                          {cn.total != null ? formatZAR(cn.total) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/admin/credit-notes/${cn.id}`}
                            className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Effective outstanding balance */}
            <div className="pt-3 border-t border-[#EAE4DC] space-y-1.5 text-sm">
              <div className="flex justify-between text-[#5C6E81]">
                <span>Invoice Total</span>
                <span>{formatZAR(doc.total ?? 0)}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between text-[#5C6E81]">
                  <span>Payments Received</span>
                  <span>− {formatZAR(totalPaid)}</span>
                </div>
              )}
              {totalCreditNotes > 0 && (
                <div className="flex justify-between text-[#5C6E81]">
                  <span>Credit Notes Applied</span>
                  <span>− {formatZAR(totalCreditNotes)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#1F2A38] border-t border-[#EAE4DC] pt-1.5">
                <span>Effective Outstanding Balance</span>
                <span className={effectiveBalance <= 0 ? "text-green-600" : ""}>
                  {formatZAR(Math.max(0, effectiveBalance))}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
