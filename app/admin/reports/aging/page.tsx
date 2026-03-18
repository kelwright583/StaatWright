"use client";

import { useEffect, useState, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgingInvoice {
  id: string;
  number: string;
  partner_id: string | null;
  partnerName: string;
  issueDate: string | null;
  dueDate: string;
  total: number;
  paid: number;
  outstanding: number;
  currency: string;
  bucket: "current" | "1_30" | "31_60" | "61_90" | "90plus";
  daysOverdue: number;
}

type Bucket = "current" | "1_30" | "31_60" | "61_90" | "90plus";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function getBucket(dueDate: string, today: Date): { bucket: Bucket; daysOverdue: number } {
  const due = new Date(dueDate);
  const diffMs = today.getTime() - due.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return { bucket: "current", daysOverdue: 0 };
  if (days <= 30) return { bucket: "1_30", daysOverdue: days };
  if (days <= 60) return { bucket: "31_60", daysOverdue: days };
  if (days <= 90) return { bucket: "61_90", daysOverdue: days };
  return { bucket: "90plus", daysOverdue: days };
}

const BUCKET_LABELS: Record<Bucket, string> = {
  current: "Current",
  "1_30":  "1–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  "90plus":"90+ days",
};

const BUCKET_COLORS: Record<Bucket, { bg: string; text: string }> = {
  current: { bg: "#dcfce7", text: "#15803d" },
  "1_30":  { bg: "#fef9c3", text: "#a16207" },
  "31_60": { bg: "#fed7aa", text: "#c2410c" },
  "61_90": { bg: "#fecaca", text: "#b91c1c" },
  "90plus":{ bg: "#f3e8ff", text: "#7e22ce" },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgingPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<AgingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch unpaid invoices with partner
      const { data: invData } = await supabase
        .from("documents")
        .select("id, number, partner_id, status, total, currency, created_at, due_date, partners(company_name)")
        .eq("type", "invoice")
        .not("status", "eq", "paid")
        .not("status", "eq", "cancelled");

      if (!invData || invData.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const invoiceIds = invData.map((inv) => inv.id);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("invoice_payments")
        .select("document_id, amount")
        .in("document_id", invoiceIds);

      // Fetch linked credit notes
      const { data: creditData } = await supabase
        .from("documents")
        .select("linked_document_id, total")
        .eq("type", "credit_note")
        .in("linked_document_id", invoiceIds);

      // Build payment totals map
      const paymentMap: Record<string, number> = {};
      for (const p of paymentsData ?? []) {
        paymentMap[p.document_id] = (paymentMap[p.document_id] ?? 0) + (p.amount ?? 0);
      }

      // Build credit note totals map
      const creditMap: Record<string, number> = {};
      for (const cn of creditData ?? []) {
        if (cn.linked_document_id) {
          creditMap[cn.linked_document_id] = (creditMap[cn.linked_document_id] ?? 0) + (cn.total ?? 0);
        }
      }

      // Build aging rows
      const rows: AgingInvoice[] = invData.map((inv) => {
        const paid = (paymentMap[inv.id] ?? 0) + (creditMap[inv.id] ?? 0);
        const total = inv.total ?? 0;
        const outstanding = Math.max(0, total - paid);

        // Due date: use due_date or created_at + 30 days
        let dueDate = inv.due_date;
        if (!dueDate) {
          const created = new Date(inv.created_at);
          created.setDate(created.getDate() + 30);
          dueDate = created.toISOString().slice(0, 10);
        }

        const { bucket, daysOverdue } = getBucket(dueDate, today);
        const partnerRaw = inv.partners as { company_name?: string } | null;

        return {
          id: inv.id,
          number: inv.number ?? "—",
          partner_id: inv.partner_id,
          partnerName: partnerRaw?.company_name ?? "Unknown",
          issueDate: inv.created_at ? inv.created_at.slice(0, 10) : null,
          dueDate,
          total,
          paid,
          outstanding,
          currency: inv.currency ?? "ZAR",
          bucket,
          daysOverdue,
        };
      }).filter((r) => r.outstanding > 0);

      setInvoices(rows);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bucket totals
  const buckets: Bucket[] = ["current", "1_30", "31_60", "61_90", "90plus"];
  const bucketTotals = buckets.reduce<Record<Bucket, number>>((acc, b) => {
    acc[b] = invoices.filter((r) => r.bucket === b).reduce((s, r) => s + r.outstanding, 0);
    return acc;
  }, {} as Record<Bucket, number>);
  const grandTotal = invoices.reduce((s, r) => s + r.outstanding, 0);

  // Group by client
  const clientGroups = invoices.reduce<Record<string, AgingInvoice[]>>((acc, inv) => {
    const key = inv.partnerName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {});

  // Multi-currency invoices
  const foreignCurrencyRows = invoices.filter((r) => r.currency !== "ZAR");

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/aging");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staatwright-aging-${today.toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
    setExporting(false);
  }

  function handlePrint() {
    window.print();
  }

  const maxBucketTotal = Math.max(...Object.values(bucketTotals), 1);

  return (
    <>
      {/* Header */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <div>
          <h2 className="text-navy font-bold text-lg leading-none" style={{ fontFamily: "var(--font-inter)" }}>
            Accounts Receivable Aging
          </h2>
          <p className="text-steel text-xs mt-0.5" style={{ fontFamily: "var(--font-montserrat)" }}>
            As at {todayStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            {exporting ? "Exporting…" : "Export XLSX"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 border border-navy text-xs text-navy hover:bg-navy hover:text-white transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            Print
          </button>
        </div>
      </div>

      <main className="pt-[56px] p-8 print:pt-0 print:p-6">
        {loading ? (
          <p className="text-steel text-sm mt-6" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : invoices.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              No outstanding invoices found.
            </p>
          </div>
        ) : (
          <>
            {/* ── Bucket summary ── */}
            <div className="mb-8 bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
              <p className="text-xs text-steel uppercase tracking-widest mb-4 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                Aging Summary
              </p>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {buckets.map((b) => (
                  <div key={b} className="text-center">
                    <p className="text-xs text-steel mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>{BUCKET_LABELS[b]}</p>
                    <p className="text-navy font-bold text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                      {formatZAR(bucketTotals[b])}
                    </p>
                  </div>
                ))}
              </div>

              {/* Visual bar chart */}
              <div className="space-y-2">
                {buckets.map((b) => {
                  const pct = grandTotal > 0 ? (bucketTotals[b] / maxBucketTotal) * 100 : 0;
                  const colors = BUCKET_COLORS[b];
                  return (
                    <div key={b} className="flex items-center gap-3">
                      <span
                        className="text-xs w-20 text-right shrink-0"
                        style={{ fontFamily: "var(--font-montserrat)", color: "#5C6E81" }}
                      >
                        {BUCKET_LABELS[b]}
                      </span>
                      <div className="flex-1 h-5 bg-linen/50" style={{ borderRadius: 0 }}>
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: colors.bg,
                            borderRight: pct > 0 ? `3px solid ${colors.text}` : "none",
                            borderRadius: 0,
                          }}
                        />
                      </div>
                      <span
                        className="text-xs w-24 shrink-0 font-medium"
                        style={{ fontFamily: "var(--font-montserrat)", color: colors.text }}
                      >
                        {formatZAR(bucketTotals[b])}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Multi-currency notice ── */}
            {foreignCurrencyRows.length > 0 && (
              <div
                className="mb-4 px-4 py-3 border-l-2 border-amber-400 bg-amber-50 text-amber-800 text-xs"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                Note: {foreignCurrencyRows.length} invoice(s) are in non-ZAR currencies and are listed separately at the bottom. Totals above reflect face value without conversion.
              </div>
            )}

            {/* ── Grouped table ── */}
            <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Invoice Date</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Due Date</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Total</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Paid</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Outstanding</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(clientGroups).map(([clientName, rows]) => {
                    const clientTotal = rows.reduce((s, r) => s + r.outstanding, 0);
                    return (
                      <Fragment key={clientName}>
                        {rows.map((row, i) => {
                          const colors = BUCKET_COLORS[row.bucket];
                          return (
                            <tr key={row.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                              <td className="px-4 py-3 text-ink font-medium">{i === 0 ? clientName : ""}</td>
                              <td className="px-4 py-3 text-steel">{row.number}</td>
                              <td className="px-4 py-3 text-steel whitespace-nowrap">{formatDate(row.issueDate)}</td>
                              <td className="px-4 py-3 text-steel whitespace-nowrap">{formatDate(row.dueDate)}</td>
                              <td className="px-4 py-3 text-ink text-right">{row.currency !== "ZAR" ? row.currency + " " : ""}{formatZAR(row.total).slice(2)}</td>
                              <td className="px-4 py-3 text-steel text-right">{formatZAR(row.paid)}</td>
                              <td className="px-4 py-3 text-ink text-right font-medium">{formatZAR(row.outstanding)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className="px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                                  style={{
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    borderRadius: 0,
                                  }}
                                >
                                  {BUCKET_LABELS[row.bucket]}
                                  {row.daysOverdue > 0 ? ` (${row.daysOverdue}d)` : ""}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Client subtotal */}
                        <tr className="border-b-2 border-linen" style={{ backgroundColor: "rgba(234,228,220,0.3)" }}>
                          <td className="px-4 py-2 text-xs text-steel font-medium uppercase tracking-wider" colSpan={6}>
                            {clientName} Subtotal
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-navy text-sm">{formatZAR(clientTotal)}</td>
                          <td />
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#1F2A38" }}>
                    <td className="px-4 py-3 text-white font-bold text-xs uppercase tracking-wider" colSpan={6}>
                      Grand Total Outstanding
                    </td>
                    <td className="px-4 py-3 text-white font-bold text-right">{formatZAR(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Bucket breakdown footer ── */}
            <div className="mt-4 grid grid-cols-5 gap-3 print:hidden">
              {buckets.map((b) => {
                const colors = BUCKET_COLORS[b];
                const count = invoices.filter((r) => r.bucket === b).length;
                return (
                  <div
                    key={b}
                    className="border border-linen p-3"
                    style={{ borderRadius: 0, borderLeftColor: colors.text, borderLeftWidth: 3 }}
                  >
                    <p className="text-xs text-steel mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {BUCKET_LABELS[b]}
                    </p>
                    <p className="text-navy font-bold text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                      {formatZAR(bucketTotals[b])}
                    </p>
                    <p className="text-xs text-steel mt-0.5" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {count} invoice{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
