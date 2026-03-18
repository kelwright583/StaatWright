"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Row component ────────────────────────────────────────────────────────────

function BSRow({
  label,
  value,
  bold,
  indent,
  muted,
  note,
  total,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  muted?: boolean;
  note?: string;
  total?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 ${total ? "border-t-2 border-navy mt-1" : "border-b border-linen/60"}`}
      style={{ paddingLeft: indent ? "1.5rem" : "0" }}
    >
      <div className="flex-1">
        <span
          className={`text-sm ${bold || total ? "font-bold" : ""} ${muted ? "text-steel" : "text-ink"}`}
          style={{ fontFamily: bold || total ? "var(--font-inter)" : "var(--font-montserrat)" }}
        >
          {label}
        </span>
        {note && (
          <span
            className="block text-xs text-steel/70 mt-0.5"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {note}
          </span>
        )}
      </div>
      <span
        className={`text-sm tabular-nums ${bold || total ? "font-bold" : ""} ${muted ? "text-steel" : "text-ink"}`}
        style={{ fontFamily: bold || total ? "var(--font-inter)" : "var(--font-montserrat)" }}
      >
        {formatZAR(value)}
      </span>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white mt-4"
      style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)" }}
    >
      {label}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BalanceSheetPage() {
  const supabase = createClient();
  const [asAtDate, setAsAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Asset values
  const [ar, setAr] = useState(0);
  const [cashEstimate, setCashEstimate] = useState(0);

  // Liability values
  const [vatPayable, setVatPayable] = useState(0);
  const [loansIn, setLoansIn] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState(0);

  // Equity values
  const [ownersCapital, setOwnersCapital] = useState(0);
  const [sweatEquity, setSweatEquity] = useState(0);
  const [drawings, setDrawings] = useState(0);
  const [retainedEarnings, setRetainedEarnings] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);

    const asAt = asAtDate;

    // ── Fetch invoices (unpaid) for AR ─────────────────────────────────────────
    const { data: allInvoices } = await supabase
      .from("documents")
      .select("id, total, currency, created_at, due_date")
      .eq("type", "invoice")
      .not("status", "eq", "paid")
      .not("status", "eq", "cancelled")
      .lte("created_at", asAt + "T23:59:59");

    // ── Fetch payments against those invoices ──────────────────────────────────
    const invoiceIds = (allInvoices ?? []).map((i) => i.id);
    let paymentsByInvoice: Record<string, number> = {};
    let creditsByInvoice: Record<string, number> = {};

    if (invoiceIds.length > 0) {
      const { data: pmts } = await supabase
        .from("invoice_payments")
        .select("document_id, amount")
        .in("document_id", invoiceIds)
        .lte("payment_date", asAt);

      for (const p of pmts ?? []) {
        paymentsByInvoice[p.document_id] = (paymentsByInvoice[p.document_id] ?? 0) + (p.amount ?? 0);
      }

      const { data: cns } = await supabase
        .from("documents")
        .select("linked_document_id, total")
        .eq("type", "credit_note")
        .in("linked_document_id", invoiceIds)
        .lte("created_at", asAt + "T23:59:59");

      for (const cn of cns ?? []) {
        if (cn.linked_document_id) {
          creditsByInvoice[cn.linked_document_id] = (creditsByInvoice[cn.linked_document_id] ?? 0) + (cn.total ?? 0);
        }
      }
    }

    const totalAR = (allInvoices ?? []).reduce((s, inv) => {
      const outstanding = Math.max(0, (inv.total ?? 0) - (paymentsByInvoice[inv.id] ?? 0) - (creditsByInvoice[inv.id] ?? 0));
      return s + outstanding;
    }, 0);
    setAr(totalAR);

    // ── Cash estimate: all payments received - all expenses ────────────────────
    const { data: allPayments } = await supabase
      .from("invoice_payments")
      .select("amount")
      .lte("payment_date", asAt);

    const totalPaymentsReceived = (allPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

    const { data: allExpenses } = await supabase
      .from("expenses")
      .select("amount_incl_vat, date")
      .lte("date", asAt);

    const totalExpensesAll = (allExpenses ?? []).reduce((s, e) => s + (e.amount_incl_vat ?? 0), 0);
    setCashEstimate(Math.max(0, totalPaymentsReceived - totalExpensesAll));

    // ── Recent expenses (last 30 days relative to asAt) for AP proxy ──────────
    const thirtyDaysAgo = new Date(asAt);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentExp } = await supabase
      .from("expenses")
      .select("amount_incl_vat")
      .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
      .lte("date", asAt);

    setRecentExpenses((recentExp ?? []).reduce((s, e) => s + (e.amount_incl_vat ?? 0), 0));

    // ── VAT payable: 15/115 of outstanding invoices ────────────────────────────
    const vatEstimate = totalAR * (15 / 115);
    setVatPayable(vatEstimate);

    // ── Equity ledger ──────────────────────────────────────────────────────────
    const { data: equityData } = await supabase
      .from("equity_ledger")
      .select("entry_type, amount")
      .lte("date", asAt);

    let capital = 0, sweat = 0, loans = 0;
    for (const e of equityData ?? []) {
      if (e.entry_type === "capital_injection") capital += e.amount ?? 0;
      if (e.entry_type === "sweat_equity") sweat += e.amount ?? 0;
      if (e.entry_type === "loan_in") loans += e.amount ?? 0;
      if (e.entry_type === "loan_repayment") loans -= e.amount ?? 0;
    }
    setOwnersCapital(capital);
    setSweatEquity(sweat);
    setLoansIn(Math.max(0, loans));

    // ── Drawings ──────────────────────────────────────────────────────────────
    const { data: drawingsData } = await supabase
      .from("drawings")
      .select("amount")
      .lte("date", asAt);

    setDrawings((drawingsData ?? []).reduce((s, d) => s + (d.amount ?? 0), 0));

    // ── Retained earnings: paid invoices total - total expenses ───────────────
    const { data: paidInvoices } = await supabase
      .from("documents")
      .select("total")
      .eq("type", "invoice")
      .eq("status", "paid")
      .lte("created_at", asAt + "T23:59:59");

    const totalPaidInvoices = (paidInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0);
    setRetainedEarnings(totalPaidInvoices - totalExpensesAll);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asAtDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalCurrentAssets = ar + cashEstimate;
  const totalAssets = totalCurrentAssets; // fixed assets not tracked

  const totalCurrentLiabilities = recentExpenses + vatPayable + loansIn;
  const totalLiabilities = totalCurrentLiabilities;

  const totalEquity = ownersCapital + sweatEquity + retainedEarnings - drawings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);
  const balanced = totalAssets === 0 || (diff / Math.max(totalAssets, 1)) <= 0.10;

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/balance-sheet?asAt=${asAtDate}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staatwright-balance-sheet-${asAtDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
    setExporting(false);
  }

  return (
    <>
      {/* Header */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <div>
          <h2 className="text-navy font-bold text-lg leading-none" style={{ fontFamily: "var(--font-inter)" }}>
            Balance Sheet
          </h2>
          <p className="text-steel text-xs mt-0.5" style={{ fontFamily: "var(--font-montserrat)" }}>
            As at {formatDate(asAtDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={asAtDate}
            onChange={(e) => setAsAtDate(e.target.value)}
            className="border-b border-linen focus:border-navy outline-none bg-transparent py-1 text-ink text-xs"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            {exporting ? "Exporting…" : "Export XLSX"}
          </button>
        </div>
      </div>

      <main className="pt-[56px] p-8">
        {loading ? (
          <p className="text-steel text-sm mt-6" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : (
          <div className="max-w-2xl">

            {/* ── Balance check indicator ── */}
            <div
              className={`mb-6 px-4 py-3 flex items-center gap-2 border ${balanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              style={{ borderRadius: 0 }}
            >
              <span className="text-lg">{balanced ? "✓" : "⚠"}</span>
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${balanced ? "text-green-700" : "text-red-700"}`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {balanced ? "Balance Check: Within tolerance" : "Balance Check: Discrepancy detected"}
                </p>
                <p
                  className={`text-xs mt-0.5 ${balanced ? "text-green-600" : "text-red-600"}`}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Assets: {formatZAR(totalAssets)} / Liabilities + Equity: {formatZAR(totalLiabilitiesAndEquity)}
                  {!balanced && ` — Difference: ${formatZAR(diff)}`}
                </p>
              </div>
            </div>

            {/* ── ASSETS ── */}
            <div className="bg-white border border-linen mb-6" style={{ borderRadius: 0 }}>
              <SectionHeader label="Assets" />
              <div className="px-6 py-4">
                <p
                  className="text-xs text-steel uppercase tracking-widest mb-3 mt-1"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Current Assets
                </p>
                <BSRow
                  label="Accounts Receivable"
                  value={ar}
                  indent
                  note="Outstanding invoice balances (total - payments - credit notes)"
                />
                <BSRow
                  label="Cash / Bank (estimated)"
                  value={cashEstimate}
                  indent
                  note="All payments received minus all expenses — connect bank account for accuracy"
                />
                <BSRow label="Total Current Assets" value={totalCurrentAssets} bold />

                <p
                  className="text-xs text-steel uppercase tracking-widest mb-3 mt-5"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Fixed Assets
                </p>
                <BSRow
                  label="Fixed assets — not tracked"
                  value={0}
                  indent
                  muted
                  note="Add fixed asset tracking to include property, equipment, and vehicles"
                />
                <BSRow label="Total Fixed Assets" value={0} bold muted />
              </div>

              <div
                className="px-6 py-3 border-t-2 border-navy flex items-center justify-between"
                style={{ backgroundColor: "rgba(31,42,56,0.04)" }}
              >
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  TOTAL ASSETS
                </span>
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  {formatZAR(totalAssets)}
                </span>
              </div>
            </div>

            {/* ── LIABILITIES ── */}
            <div className="bg-white border border-linen mb-6" style={{ borderRadius: 0 }}>
              <SectionHeader label="Liabilities" />
              <div className="px-6 py-4">
                <p
                  className="text-xs text-steel uppercase tracking-widest mb-3 mt-1"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Current Liabilities
                </p>
                <BSRow
                  label="Accounts Payable (approx.)"
                  value={recentExpenses}
                  indent
                  note="Total expenses in last 30 days — approximation; connect accounting for accuracy"
                />
                <BSRow
                  label="VAT Payable (estimated)"
                  value={vatPayable}
                  indent
                  note="15/115 of outstanding AR — estimate only; consult your accountant"
                />
                <BSRow
                  label="Loans / Shareholder Loans"
                  value={loansIn}
                  indent
                  note="Net of loan_in minus loan_repayment entries in equity ledger"
                />
                <BSRow label="Total Current Liabilities" value={totalCurrentLiabilities} bold />
              </div>

              <div
                className="px-6 py-3 border-t-2 border-navy flex items-center justify-between"
                style={{ backgroundColor: "rgba(31,42,56,0.04)" }}
              >
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  TOTAL LIABILITIES
                </span>
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  {formatZAR(totalLiabilities)}
                </span>
              </div>
            </div>

            {/* ── EQUITY ── */}
            <div className="bg-white border border-linen mb-6" style={{ borderRadius: 0 }}>
              <SectionHeader label="Equity" />
              <div className="px-6 py-4">
                <BSRow
                  label="Owners' Capital"
                  value={ownersCapital}
                  indent
                  note="Sum of capital_injection entries in equity ledger"
                />
                <BSRow
                  label="Sweat Equity"
                  value={sweatEquity}
                  indent
                  note="Sum of sweat_equity entries in equity ledger"
                />
                <BSRow
                  label="Retained Earnings"
                  value={retainedEarnings}
                  indent
                  note="Total paid invoices minus total expenses (approximate P&L retained)"
                />
                <BSRow
                  label="Drawings (deducted)"
                  value={-drawings}
                  indent
                  note="Total drawings by all owners"
                />
              </div>

              <div
                className="px-6 py-3 border-t-2 border-navy flex items-center justify-between"
                style={{ backgroundColor: "rgba(31,42,56,0.04)" }}
              >
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  TOTAL EQUITY
                </span>
                <span className="text-sm font-bold text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                  {formatZAR(totalEquity)}
                </span>
              </div>
            </div>

            {/* ── L + E Total ── */}
            <div
              className="bg-navy px-6 py-4 flex items-center justify-between"
              style={{ borderRadius: 0 }}
            >
              <span
                className="text-white font-bold text-sm uppercase tracking-widest"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Total Liabilities + Equity
              </span>
              <span className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                {formatZAR(totalLiabilitiesAndEquity)}
              </span>
            </div>

            {/* ── Disclaimer ── */}
            <div
              className="mt-6 px-4 py-3 border-l-2 border-steel/40 bg-linen/30 text-xs text-steel"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              This balance sheet is an approximation based on available data. Connect bank accounts and journal entries for IFRS-compliant reporting. VAT and cash figures are estimates only.
            </div>
          </div>
        )}
      </main>
    </>
  );
}
