import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type { Document, DocumentEvent, Expense } from "@/lib/types";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    paid:     { dot: "bg-green-500",  label: "Paid" },
    overdue:  { dot: "bg-red-500",    label: "Overdue" },
    sent:     { dot: "bg-amber-500",  label: "Sent" },
    draft:    { dot: "bg-steel",      label: "Draft" },
    accepted: { dot: "bg-green-400",  label: "Accepted" },
    declined: { dot: "bg-red-400",    label: "Declined" },
    expired:  { dot: "bg-red-300",    label: "Expired" },
    cancelled:{ dot: "bg-steel",      label: "Cancelled" },
    issued:   { dot: "bg-amber-400",  label: "Issued" },
  };

  const entry = map[status] ?? { dot: "bg-steel", label: status };

  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  badge?: React.ReactNode;
}

function StatCard({ label, value, badge }: StatCardProps) {
  return (
    <div className="bg-white border border-linen p-6 flex flex-col gap-2" style={{ borderRadius: 0 }}>
      <span
        className="text-xs text-steel uppercase tracking-widest"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className="text-navy font-bold text-2xl"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {value}
        </span>
        {badge}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Outstanding invoices: sent or overdue
  const { data: outstandingInvoices } = await supabase
    .from("documents")
    .select("*, client:clients(company_name)")
    .eq("type", "invoice")
    .in("status", ["sent", "overdue"]);

  // Overdue invoices
  const overdueInvoices = (outstandingInvoices ?? []).filter(
    (d: Document) => d.status === "overdue"
  );

  // Open quotes: sent or accepted
  const { data: openQuotes } = await supabase
    .from("documents")
    .select("id")
    .eq("type", "quote")
    .in("status", ["sent", "accepted"]);

  // MTD expenses
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: mtdExpenses } = await supabase
    .from("expenses")
    .select("id, date, description, category, amount_excl_vat, vat_amount, amount_incl_vat, slip_path, notes, client_id, created_at, updated_at")
    .gte("created_at", firstOfMonth);

  // Recent events
  const { data: recentEvents } = await supabase
    .from("document_events")
    .select("*, document:documents(number, type)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculations
  const outstandingTotal = (outstandingInvoices ?? []).reduce(
    (sum: number, d: Document) => sum + (d.total ?? 0),
    0
  );
  const overdueCount = overdueInvoices.length;
  const openQuotesCount = (openQuotes ?? []).length;
  const mtdTotal = (mtdExpenses ?? []).reduce(
    (sum: number, e: Expense) => sum + (e.amount_incl_vat ?? 0),
    0
  );

  return (
    <>
      <AdminTopBar
        title="Dashboard"
        user={user ? { email: user.email ?? "" } : null}
      />

      {/* Content */}
      <main className="pt-[56px] p-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Outstanding" value={formatZAR(outstandingTotal)} />
          <StatCard
            label="Overdue"
            value={String(overdueCount)}
            badge={
              overdueCount > 0 ? (
                <span
                  className="text-xs font-medium text-white bg-red-500 px-2 py-0.5"
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  {overdueCount}
                </span>
              ) : undefined
            }
          />
          <StatCard label="Open Quotes" value={String(openQuotesCount)} />
          <StatCard label="Expenses (MTD)" value={formatZAR(mtdTotal)} />
        </div>

        {/* Bottom two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Outstanding invoices table */}
          <div className="xl:col-span-2">
            <h3
              className="text-navy font-bold text-sm mb-3 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Outstanding Invoices
            </h3>
            <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Invoice #</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(outstandingInvoices ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-steel text-sm">
                        No outstanding invoices
                      </td>
                    </tr>
                  ) : (
                    (outstandingInvoices ?? []).map((doc: Document & { client?: { company_name: string } }) => (
                      <tr key={doc.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                        <td className="px-4 py-3 text-ink text-sm">
                          {doc.client?.company_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ink text-sm">{doc.number}</td>
                        <td className="px-4 py-3 text-ink text-sm text-right">{formatZAR(doc.total ?? 0)}</td>
                        <td className="px-4 py-3 text-steel text-sm">
                          {doc.due_date
                            ? new Date(doc.due_date).toLocaleDateString("en-ZA", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/admin/invoices/${doc.id}`}
                            className="text-xs text-steel hover:text-navy underline transition-colors"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3
              className="text-navy font-bold text-sm mb-3 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Recent Activity
            </h3>
            <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
              {(recentEvents ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No recent activity
                </p>
              ) : (
                <ul className="divide-y divide-linen">
                  {(recentEvents ?? []).map((event: DocumentEvent & { document?: { number: string; type: string } }) => (
                    <li key={event.id} className="px-4 py-3 flex flex-col gap-0.5">
                      <span
                        className="text-xs text-steel"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {new Date(event.created_at).toLocaleDateString("en-ZA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className="text-sm text-ink"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {event.document?.number
                          ? `${event.document.type} ${event.document.number} — `
                          : ""}
                        <span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
