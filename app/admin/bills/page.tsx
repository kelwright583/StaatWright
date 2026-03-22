import { createClient, getSessionUser } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import Link from "next/link";
import { formatZAR, formatDate } from "@/lib/utils";

type BillStatus = "draft" | "received" | "paid" | "overdue";

interface BillRow {
  id: string;
  number: string;
  status: BillStatus;
  issue_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  currency: string | null;
  description: string | null;
  venture: { company_name: string } | null;
  service_provider: { name: string } | null;
}

function statusStyle(status: BillStatus) {
  switch (status) {
    case "paid":     return { bg: "rgba(34,197,94,0.1)",   color: "#16a34a" };
    case "overdue":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626" };
    case "received": return { bg: "rgba(59,130,246,0.1)",  color: "#2563eb" };
    default:         return { bg: "rgba(156,163,175,0.15)", color: "#6b7280" };
  }
}

export default async function BillsPage() {
  const supabase = await createClient();
  const user = await getSessionUser();

  const { data } = await supabase
    .from("bills")
    .select("id, number, status, issue_date, due_date, total_amount, currency, description, venture:partners(company_name), service_provider:service_providers(name)")
    .order("issue_date", { ascending: false, nullsFirst: false });

  const bills = (data ?? []) as unknown as BillRow[];

  // Summary
  const outstanding = bills
    .filter(b => b.status === "received" || b.status === "overdue")
    .reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const totalPaid = bills
    .filter(b => b.status === "paid")
    .reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const overdueCount = bills.filter(b => b.status === "overdue").length;

  return (
    <>
      <AdminTopBar title="Bills" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[#1F2A38] font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>Bills</h1>
          <Link
            href="/admin/bills/new"
            className="px-5 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
          >
            + New Bill
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#EAE4DC] p-5">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>Outstanding</p>
            <p className="font-bold text-2xl" style={{ fontFamily: "var(--font-inter)", color: outstanding > 0 ? "#dc2626" : "#1F2A38" }}>{formatZAR(outstanding)}</p>
          </div>
          <div className="bg-white border border-[#EAE4DC] p-5">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>Total Paid</p>
            <p className="text-[#1F2A38] font-bold text-2xl" style={{ fontFamily: "var(--font-inter)" }}>{formatZAR(totalPaid)}</p>
          </div>
          <div className="bg-white border border-[#EAE4DC] p-5">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>Overdue Bills</p>
            <p className="font-bold text-2xl" style={{ fontFamily: "var(--font-inter)", color: overdueCount > 0 ? "#dc2626" : "#1F2A38" }}>{overdueCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#EAE4DC] overflow-x-auto">
          {bills.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                No bills yet. Create your first bill to get started.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              <thead>
                <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Bill #</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Provider</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Venture</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Issue Date</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Due Date</th>
                  <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {bills.map(b => {
                  const sc = statusStyle(b.status);
                  const isForex = b.currency && b.currency !== "ZAR";
                  return (
                    <tr key={b.id} className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1F2A38] whitespace-nowrap">{b.number}</td>
                      <td className="px-4 py-3 text-[#5C6E81] whitespace-nowrap">{(b.service_provider as { name?: string } | null)?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#5C6E81] whitespace-nowrap">{(b.venture as { company_name?: string } | null)?.company_name ?? <span className="text-xs italic text-[#5C6E81]">StaatWright</span>}</td>
                      <td className="px-4 py-3 text-[#5C6E81] max-w-xs truncate">{b.description ?? "—"}</td>
                      <td className="px-4 py-3 text-[#5C6E81] whitespace-nowrap">{b.issue_date ? formatDate(b.issue_date) : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: b.status === "overdue" ? "#dc2626" : "#5C6E81" }}>
                        {b.due_date ? formatDate(b.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1F2A38] whitespace-nowrap">
                        {b.total_amount != null ? (
                          <span>{isForex ? `${b.currency} ` : ""}{b.total_amount.toFixed(2)}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 font-medium capitalize" style={{ ...sc, borderRadius: 0 }}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/bills/${b.id}`} className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
          {bills.length} bill{bills.length !== 1 ? "s" : ""} total
        </p>
      </main>
    </>
  );
}
