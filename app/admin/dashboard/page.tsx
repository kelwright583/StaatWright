import { createClient, getSessionUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type { Document, DocumentEvent, Expense, Partner, ExpenseInboxItem } from "@/lib/types";
import { formatZAR } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    paid:           { dot: "bg-green-500",  label: "Paid" },
    overdue:        { dot: "bg-red-500",    label: "Overdue" },
    sent:           { dot: "bg-amber-500",  label: "Sent" },
    draft:          { dot: "bg-steel",      label: "Draft" },
    accepted:       { dot: "bg-green-400",  label: "Accepted" },
    declined:       { dot: "bg-red-400",    label: "Declined" },
    expired:        { dot: "bg-red-300",    label: "Expired" },
    cancelled:      { dot: "bg-steel",      label: "Cancelled" },
    issued:         { dot: "bg-amber-400",  label: "Issued" },
    partially_paid: { dot: "bg-indigo-500", label: "Partially Paid" },
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
  valueColor?: string;
}

function StatCard({ label, value, badge, valueColor }: StatCardProps) {
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
          className="font-bold text-2xl"
          style={{ fontFamily: "var(--font-inter)", color: valueColor ?? "#1F2A38" }}
        >
          {value}
        </span>
        {badge}
      </div>
    </div>
  );
}

async function markPaidAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const user = await getSessionUser();
  await supabase.from("documents").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("document_events").insert({
    document_id: id,
    event_type: "paid",
    detail: { from: "sent", to: "paid" },
    created_by: user?.id ?? null,
  });
  revalidatePath("/admin/dashboard");
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const user = await getSessionUser();

  // Outstanding invoices: sent, overdue, or partially_paid
  const { data: outstandingInvoices } = await supabase
    .from("documents")
    .select("*, partner:partners(company_name)")
    .eq("type", "invoice")
    .in("status", ["sent", "overdue", "partially_paid"]);

  // Overdue invoices
  const overdueInvoices = (outstandingInvoices ?? []).filter(
    (d: Document) => d.status === "overdue"
  );

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // This month's paid invoices (revenue)
  const { data: paidThisMonth } = await supabase
    .from("documents")
    .select("total")
    .eq("type", "invoice")
    .eq("status", "paid")
    .gte("issue_date", firstOfMonth.slice(0, 10))
    .lte("issue_date", lastOfMonth.slice(0, 10));

  // MTD expenses
  const { data: mtdExpenses } = await supabase
    .from("expenses")
    .select("id, date, description, category, amount_excl_vat, vat_amount, amount_incl_vat, slip_path, notes, partner_id, created_at, updated_at")
    .gte("created_at", firstOfMonth);

  // Pending expense inbox items (last 3 for preview)
  const { data: inboxItems } = await supabase
    .from("expense_inbox")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(3);

  // Total pending inbox count
  const { count: pendingInboxCount } = await supabase
    .from("expense_inbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Active ventures
  const { data: activeVentures } = await supabase
    .from("partners")
    .select("id, company_name, status")
    .eq("type", "venture")
    .eq("status", "active")
    .limit(4);

  // Recent events
  const { data: recentEvents } = await supabase
    .from("document_events")
    .select("*, document:documents(number, type, partner:partners(company_name))")
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculations
  const outstandingTotal = (outstandingInvoices ?? []).reduce(
    (sum: number, d: Document) => sum + (d.total ?? 0),
    0
  );
  const outstandingCount = (outstandingInvoices ?? []).length;
  const overdueTotal = overdueInvoices.reduce(
    (sum: number, d: Document) => sum + (d.total ?? 0),
    0
  );
  const overdueCount = overdueInvoices.length;
  const revenueThisMonth = (paidThisMonth ?? []).reduce(
    (sum: number, d: { total: number | null }) => sum + (d.total ?? 0),
    0
  );
  const mtdTotal = (mtdExpenses ?? []).reduce(
    (sum: number, e: Expense) => sum + (e.amount_incl_vat ?? 0),
    0
  );
  const netThisMonth = revenueThisMonth - mtdTotal;

  return (
    <>
      <AdminTopBar
        title="Dashboard"
        user={user ? { email: user.email ?? "" } : null}
      />

      <main className="pt-[56px] p-8 space-y-8">
        {/* Stat cards — 5 wide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Outstanding"
            value={formatZAR(outstandingTotal)}
            badge={
              outstandingCount > 0 ? (
                <span
                  className="text-xs font-medium text-white bg-amber-500 px-2 py-0.5"
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  {outstandingCount} inv
                </span>
              ) : undefined
            }
          />
          <StatCard
            label="Overdue"
            value={String(overdueCount)}
            badge={
              overdueCount > 0 ? (
                <span
                  className="text-xs font-medium text-white bg-red-500 px-2 py-0.5"
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  {formatZAR(overdueTotal)}
                </span>
              ) : undefined
            }
          />
          <StatCard label="This Month Revenue" value={formatZAR(revenueThisMonth)} />
          <StatCard label="This Month Expenses" value={formatZAR(mtdTotal)} />
          <StatCard
            label="Net This Month"
            value={formatZAR(netThisMonth)}
            valueColor={netThisMonth >= 0 ? "#16a34a" : "#dc2626"}
          />
        </div>

        {/* Middle row — 3 panels */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Panel 1: Outstanding Invoices */}
          <div className="xl:col-span-1">
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
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Partner</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Inv #</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(outstandingInvoices ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-steel text-sm">
                        No outstanding invoices
                      </td>
                    </tr>
                  ) : (
                    (outstandingInvoices ?? []).map((doc: Document & { partner?: { company_name: string } }) => (
                      <tr key={doc.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                        <td className="px-4 py-3 text-ink text-sm truncate max-w-[120px]">
                          {doc.partner?.company_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ink text-sm">{doc.number}</td>
                        <td className="px-4 py-3 text-ink text-sm text-right">{formatZAR(doc.total ?? 0)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/invoices/${doc.id}`}
                              className="text-xs text-steel hover:text-navy underline transition-colors"
                            >
                              View →
                            </Link>
                            <form action={markPaidAction}>
                              <input type="hidden" name="id" value={doc.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-green-700 hover:text-green-900 underline transition-colors"
                                style={{ fontFamily: "var(--font-montserrat)" }}
                              >
                                Mark Paid
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 2: Slip Inbox Preview */}
          <div className="xl:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-navy font-bold text-sm uppercase tracking-wider"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Slip Inbox
              </h3>
              {(pendingInboxCount ?? 0) > 0 && (
                <span
                  className="text-xs font-medium text-white bg-amber-500 px-2 py-0.5"
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  {pendingInboxCount} pending
                </span>
              )}
            </div>
            <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
              {(inboxItems ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No pending slips
                </p>
              ) : (
                <ul className="divide-y divide-linen">
                  {(inboxItems ?? []).map((item: ExpenseInboxItem) => (
                    <li key={item.id} className="px-4 py-3 flex flex-col gap-0.5">
                      <span
                        className="text-sm text-ink font-medium truncate"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {item.ai_vendor_name ?? item.vendor_name ?? "Unknown vendor"}
                      </span>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs text-steel"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          {item.ai_date ?? item.expense_date
                            ? new Date(item.ai_date ?? item.expense_date ?? "").toLocaleDateString("en-ZA", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "No date"}
                        </span>
                        <span
                          className="text-sm text-ink font-medium"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          {item.ai_total_amount != null || item.total_amount != null
                            ? formatZAR(item.total_amount ?? item.ai_total_amount ?? 0)
                            : "—"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(pendingInboxCount ?? 0) > 0 && (
                <div className="border-t border-linen px-4 py-3">
                  <Link
                    href="/admin/expenses"
                    className="text-xs text-steel hover:text-navy underline transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Review All →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Panel 3: Active Ventures Snapshot */}
          <div className="xl:col-span-1">
            <h3
              className="text-navy font-bold text-sm mb-3 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Active Ventures
            </h3>
            <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
              {(activeVentures ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No active ventures
                </p>
              ) : (
                <ul className="divide-y divide-linen">
                  {(activeVentures ?? []).map((v: Pick<Partner, "id" | "company_name" | "status">) => (
                    <li key={v.id} className="px-4 py-3 flex items-center justify-between">
                      <span
                        className="text-sm text-ink font-medium"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {v.company_name}
                      </span>
                      <Link
                        href={`/admin/partners/${v.id}`}
                        className="text-xs text-steel hover:text-navy underline transition-colors"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        View →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-linen px-4 py-3">
                <Link
                  href="/admin/partners?type=venture"
                  className="text-xs text-steel hover:text-navy underline transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  View all →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed — full width at bottom */}
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
                {(recentEvents ?? []).map((event: DocumentEvent & { document?: { number: string; type: string; partner?: { company_name: string } } }) => {
                  const docRef = event.document?.number
                    ? `${event.document.type === "invoice" ? "Invoice" : event.document.type === "quote" ? "Quote" : "Credit Note"} ${event.document.number}`
                    : "Document";
                  const partnerLabel = event.document?.partner?.company_name
                    ? ` · ${event.document.partner.company_name}`
                    : "";
                  const descriptions: Record<string, string> = {
                    sent:             `${docRef} sent${partnerLabel}`,
                    paid:             `${docRef} marked as paid${partnerLabel}`,
                    payment_recorded: `Payment recorded on ${docRef}${partnerLabel}`,
                    status_changed:   `${docRef} status updated${partnerLabel}`,
                    created:          `${docRef} created${partnerLabel}`,
                  };
                  const description = descriptions[event.event_type] ?? `${docRef} — ${event.event_type.replace(/_/g, " ")}`;
                  return (
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
                        {description}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
