import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentList from "@/components/admin/DocumentList";
import type { Document } from "@/lib/types";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_MAP: Record<string, { dot: string; label: string }> = {
  draft:  { dot: "bg-[#5C6E81]", label: "Draft" },
  issued: { dot: "bg-amber-400", label: "Issued" },
};

function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { dot: "bg-[#5C6E81]", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-[#5C6E81] capitalize">{entry.label}</span>
    </span>
  );
}

type CreditNoteRow = Document & {
  partner?: { company_name: string } | null;
  linked_invoice?: { id: string; number: string } | null;
};

export default async function CreditNotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try to select linked_document_id; fall back to basic select if column absent
  const { data, error } = await supabase
    .from("documents")
    .select("*, partner:partners(company_name), linked_invoice:documents!linked_document_id(id, number)")
    .eq("type", "credit_note")
    .order("created_at", { ascending: false });

  // If the join fails (column doesn't exist yet), fall back to a plain select
  const { data: fallbackData } = error
    ? await supabase
        .from("documents")
        .select("*, partner:partners(company_name)")
        .eq("type", "credit_note")
        .order("created_at", { ascending: false })
    : { data: null };

  const documents = ((error ? fallbackData : data) ?? []) as CreditNoteRow[];
  const hasLinkedColumn = !error;

  return (
    <>
      <AdminTopBar
        title="Credit Notes"
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <h1
              className="text-[#1F2A38] font-bold text-xl"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              All Credit Notes
            </h1>
            <Link
              href="/admin/credit-notes/new"
              className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              + New Credit Note
            </Link>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
            {documents.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No credit notes yet.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">#</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Client</th>
                    <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Issue Date</th>
                    {hasLinkedColumn && (
                      <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                        Linked Invoice
                      </th>
                    )}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-[#1A1A1A] font-medium">{doc.number}</td>
                      <td className="px-4 py-3 text-[#1A1A1A]">
                        {doc.partner?.company_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#1A1A1A] text-right">
                        {formatZAR(doc.total ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 text-[#5C6E81]">
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString("en-ZA", {
                              day: "2-digit", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                      {hasLinkedColumn && (
                        <td className="px-4 py-3 text-[#5C6E81]">
                          {doc.linked_invoice ? (
                            <Link
                              href={`/admin/invoices/${doc.linked_invoice.id}`}
                              className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                            >
                              {doc.linked_invoice.number}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/credit-notes/${doc.id}`}
                          className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
