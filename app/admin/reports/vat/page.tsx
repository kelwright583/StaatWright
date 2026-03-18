"use client";

/*
 * VAT201 Report — prepares data for SARS bi-monthly VAT return.
 *
 * SQL MIGRATIONS REQUIRED (run once in Supabase SQL editor):
 * ─────────────────────────────────────────────────────────────
 * ALTER TABLE documents ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0.15;
 * ALTER TABLE documents ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
 * ALTER TABLE documents ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Net 30';
 * ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0.15;
 * ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Document, Expense, Partner } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocWithPartner = Document & {
  partner?: Pick<Partner, "company_name"> | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
};

type ExpenseWithVat = Expense & {
  vat_rate?: number | null;
  // vat_amount already on Expense type
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// VAT bi-monthly periods (SA VAT201: Feb/Mar, Apr/May, Jun/Jul, Aug/Sep, Oct/Nov, Dec/Jan)
// Period index 0 = Dec–Jan, 1 = Feb–Mar, … 5 = Oct–Nov
function getBiMonthlyPeriods(now: Date): {
  label: string;
  from: string;
  to: string;
}[] {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  // Current bi-monthly period boundaries (pairs starting Feb)
  // Pairs: [1,2], [3,4], [5,6], [7,8], [9,10], [11,0(next year)]
  const pairs: [number, number][] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
    [11, 0],
  ];

  function pairLabel(startMonth: number, endMonth: number, year: number): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (endMonth === 0) {
      return `${months[startMonth]} ${year} – ${months[0]} ${year + 1}`;
    }
    return `${months[startMonth]} – ${months[endMonth]} ${year}`;
  }

  function pairRange(startMonth: number, endMonth: number, year: number): { from: string; to: string } {
    const from = new Date(year, startMonth, 1).toISOString().slice(0, 10);
    const to =
      endMonth === 0
        ? new Date(year + 1, 1, 0).toISOString().slice(0, 10) // end of Jan next year
        : new Date(year, endMonth + 1, 0).toISOString().slice(0, 10);
    return { from, to };
  }

  // Find which pair the current month falls in
  let currentPairIdx = pairs.findIndex(([s, e]) => {
    if (e === 0) return m === 11 || m === 0;
    return m === s || m === e;
  });
  if (currentPairIdx === -1) currentPairIdx = 0;

  const [cs, ce] = pairs[currentPairIdx];
  const currentYear = ce === 0 && m === 0 ? y - 1 : y;
  const currentRange = pairRange(cs, ce, currentYear);
  const currentLabel = pairLabel(cs, ce, currentYear);

  // Previous pair
  const prevIdx = (currentPairIdx - 1 + 6) % 6;
  const [ps, pe] = pairs[prevIdx];
  const prevYear = prevIdx === 5 && currentPairIdx === 0 ? y - 1 : currentYear;
  const prevRange = pairRange(ps, pe, prevYear < currentYear ? prevYear : prevYear - (prevIdx > currentPairIdx ? 1 : 0));
  const prevLabel = pairLabel(ps, pe, prevRange.from.slice(0, 4) as unknown as number);

  return [
    { label: `Current Period (${currentLabel})`, from: currentRange.from, to: currentRange.to },
    { label: `Last Period (${prevLabel})`, from: prevRange.from, to: prevRange.to },
  ];
}

// ─── Styled atoms ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs text-[#5C6E81] uppercase tracking-widest font-medium mb-3"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VatReportPage() {
  const supabase = createClient();
  const now = new Date();

  const periods = getBiMonthlyPeriods(now);
  const [periodKey, setPeriodKey] = useState<string>("0"); // index into periods[] or "custom"
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [outputDocs, setOutputDocs] = useState<DocWithPartner[]>([]);
  const [inputExpenses, setInputExpenses] = useState<ExpenseWithVat[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  function getRange(): { from: string; to: string } | null {
    if (periodKey === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    const idx = parseInt(periodKey, 10);
    return periods[idx] ?? null;
  }

  const loadData = useCallback(async () => {
    const range = getRange();
    if (!range) return;

    setLoading(true);
    try {
      const [{ data: invData }, { data: expData }] = await Promise.all([
        supabase
          .from("documents")
          .select("*, partner:partners(company_name)")
          .eq("type", "invoice")
          .in("status", ["paid", "partial"])
          .gte("issue_date", range.from)
          .lte("issue_date", range.to)
          .order("issue_date", { ascending: true }),
        supabase
          .from("expenses")
          .select("*")
          .gte("date", range.from)
          .lte("date", range.to)
          .order("date", { ascending: true }),
      ]);
      setOutputDocs((invData ?? []) as DocWithPartner[]);
      setInputExpenses((expData ?? []) as ExpenseWithVat[]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey, customFrom, customTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── VAT calculations ──────────────────────────────────────────────────────

  function getDocVat(doc: DocWithPartner): {
    excl: number;
    vatAmt: number;
    incl: number;
  } {
    const incl = doc.total ?? 0;
    // Prefer stored vat_amount; fall back to vat_total; fall back to calculating at 15%
    const vatAmt = doc.vat_amount ?? doc.vat_total ?? 0;
    const excl = incl - vatAmt;
    return { excl, vatAmt, incl };
  }

  function getExpenseVat(exp: ExpenseWithVat): {
    excl: number;
    vatAmt: number;
    incl: number;
  } {
    // If vat_amount is set, use it; else derive from vat_rate (default 15%) on amount_incl_vat
    const incl = exp.amount_incl_vat ?? exp.vat_amount ?? 0;
    let vatAmt = exp.vat_amount ?? 0;
    if (!vatAmt && incl) {
      const rate = exp.vat_rate ?? 0.15;
      // Reverse-calculate: VAT = incl * rate / (1 + rate)
      vatAmt = rate > 0 ? incl * rate / (1 + rate) : 0;
    }
    const excl = incl - vatAmt;
    return { excl, vatAmt, incl };
  }

  const outputTotals = outputDocs.reduce(
    (acc, doc) => {
      const { excl, vatAmt, incl } = getDocVat(doc);
      return { excl: acc.excl + excl, vat: acc.vat + vatAmt, incl: acc.incl + incl };
    },
    { excl: 0, vat: 0, incl: 0 }
  );

  const inputTotals = inputExpenses.reduce(
    (acc, exp) => {
      const { excl, vatAmt, incl } = getExpenseVat(exp);
      return { excl: acc.excl + excl, vat: acc.vat + vatAmt, incl: acc.incl + incl };
    },
    { excl: 0, vat: 0, incl: 0 }
  );

  const netVat = outputTotals.vat - inputTotals.vat;
  const range = getRange();

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!range) return;
    setExportLoading(true);
    try {
      const res = await fetch(
        `/api/reports/vat?from=${range.from}&to=${range.to}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vat-report-${range.from}-to-${range.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Please try again.");
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Top bar */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-[#EAE4DC] z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2
          className="text-[#1F2A38] font-bold text-lg"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          VAT Report
        </h2>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading || !range}
          className="px-4 py-2 border border-[#1F2A38] text-[#1F2A38] text-xs font-semibold hover:bg-[#1F2A38] hover:text-white transition-colors disabled:opacity-40"
          style={{ fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {exportLoading ? "Exporting…" : "Export for Bookkeeper"}
        </button>
      </div>

      <main
        className="pt-[56px] p-8 space-y-8"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {/* ── Period selector ── */}
        <div className="flex flex-wrap gap-2 items-center">
          {periods.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPeriodKey(String(i))}
              className="px-4 py-1.5 border text-xs transition-colors"
              style={{
                borderRadius: 0,
                borderColor: periodKey === String(i) ? "#1F2A38" : "#EAE4DC",
                backgroundColor: periodKey === String(i) ? "#1F2A38" : "white",
                color: periodKey === String(i) ? "white" : "#5C6E81",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriodKey("custom")}
            className="px-4 py-1.5 border text-xs transition-colors"
            style={{
              borderRadius: 0,
              borderColor: periodKey === "custom" ? "#1F2A38" : "#EAE4DC",
              backgroundColor: periodKey === "custom" ? "#1F2A38" : "white",
              color: periodKey === "custom" ? "white" : "#5C6E81",
            }}
          >
            Custom Range
          </button>
        </div>

        {periodKey === "custom" && (
          <div className="flex gap-4">
            <div className="w-48">
              <label
                className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                From
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border-b border-[#EAE4DC] focus:border-[#1F2A38] outline-none bg-transparent py-2 w-full text-[#1A1A1A] text-sm"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="w-48">
              <label
                className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                To
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border-b border-[#EAE4DC] focus:border-[#1F2A38] outline-none bg-transparent py-2 w-full text-[#1A1A1A] text-sm"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        )}

        {range && (
          <p className="text-xs text-[#5C6E81]">
            Period: {formatDate(range.from)} — {formatDate(range.to)}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[#5C6E81]">Loading…</p>
        ) : (
          <div className="space-y-10">
            {/* ── VAT Summary box ── */}
            <div
              className="bg-[#1F2A38] text-white p-6 max-w-md"
              style={{ borderRadius: 0 }}
            >
              <p
                className="text-xs uppercase tracking-widest mb-4 text-[#EAE4DC] font-medium"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                VAT201 Summary
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#EAE4DC]">Output VAT (collected from clients)</span>
                  <span className="font-semibold">{formatZAR(outputTotals.vat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#EAE4DC]">Input VAT (claimable on expenses)</span>
                  <span className="font-semibold">({formatZAR(inputTotals.vat)})</span>
                </div>
                <div className="border-t border-[#5C6E81] pt-3 mt-2 flex justify-between">
                  <span
                    className="font-bold text-base"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {netVat >= 0 ? "Net VAT Payable to SARS" : "VAT Refund Due"}
                  </span>
                  <span
                    className="font-bold text-xl"
                    style={{
                      fontFamily: "var(--font-inter)",
                      color: netVat >= 0 ? "#F3F2EE" : "#86efac",
                    }}
                  >
                    {formatZAR(Math.abs(netVat))}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Output VAT ── */}
            <div>
              <SectionHeading>Output VAT — Tax Collected from Clients</SectionHeading>
              <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
                {outputDocs.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#5C6E81]">
                    No paid/partial invoices in this period.
                  </p>
                ) : (
                  <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <thead>
                      <tr
                        className="border-b border-[#EAE4DC]"
                        style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
                      >
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Invoice #</th>
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Client</th>
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Date</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Excl. VAT</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">VAT Amount</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Incl. VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputDocs.map((doc) => {
                        const { excl, vatAmt, incl } = getDocVat(doc);
                        return (
                          <tr key={doc.id} className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/10 transition-colors">
                            <td className="px-4 py-3 text-[#1F2A38] font-medium">{doc.number}</td>
                            <td className="px-4 py-3 text-[#5C6E81]">
                              {doc.partner?.company_name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-[#5C6E81] whitespace-nowrap">
                              {formatDate(doc.issue_date)}
                            </td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right">{formatZAR(excl)}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right">{formatZAR(vatAmt)}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right font-medium">{formatZAR(incl)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#1F2A38]">
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold text-[#1F2A38] uppercase tracking-wider">
                          Totals
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(outputTotals.excl)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(outputTotals.vat)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(outputTotals.incl)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* ── Input VAT ── */}
            <div>
              <SectionHeading>Input VAT — Tax Paid on Expenses (Claimable)</SectionHeading>
              <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
                {inputExpenses.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#5C6E81]">
                    No expenses in this period.
                  </p>
                ) : (
                  <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <thead>
                      <tr
                        className="border-b border-[#EAE4DC]"
                        style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
                      >
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Description</th>
                        <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Excl. VAT</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">VAT Amount</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Incl. VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inputExpenses.map((exp) => {
                        const { excl, vatAmt, incl } = getExpenseVat(exp);
                        return (
                          <tr key={exp.id} className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/10 transition-colors">
                            <td className="px-4 py-3 text-[#5C6E81] whitespace-nowrap">{formatDate(exp.date)}</td>
                            <td className="px-4 py-3 text-[#1A1A1A]">{exp.description}</td>
                            <td className="px-4 py-3 text-[#5C6E81]">{exp.category ?? "—"}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right">{formatZAR(excl)}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right">{formatZAR(vatAmt)}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] text-right font-medium">{formatZAR(incl)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#1F2A38]">
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold text-[#1F2A38] uppercase tracking-wider">
                          Totals
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(inputTotals.excl)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(inputTotals.vat)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2A38]">{formatZAR(inputTotals.incl)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
