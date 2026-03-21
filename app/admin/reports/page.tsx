"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Document, Expense, Drawing, Partner, OwnerSettings } from "@/lib/types";
import { formatZAR, formatDate } from "@/lib/utils";

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "this_month") {
    return {
      from: new Date(y, m, 1).toISOString().slice(0, 10),
      to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (period === "last_month") {
    return {
      from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
      to: new Date(y, m, 0).toISOString().slice(0, 10),
    };
  }
  if (period === "this_quarter") {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
      to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
    };
  }
  if (period === "this_fy") {
    // March–February
    const fyStart = m >= 2 ? new Date(y, 2, 1) : new Date(y - 1, 2, 1);
    const fyEnd = new Date(fyStart.getFullYear() + 1, 1, 28);
    return { from: fyStart.toISOString().slice(0, 10), to: fyEnd.toISOString().slice(0, 10) };
  }
  if (period === "last_fy") {
    const fyStart = m >= 2 ? new Date(y - 1, 2, 1) : new Date(y - 2, 2, 1);
    const fyEnd = new Date(fyStart.getFullYear() + 1, 1, 28);
    return { from: fyStart.toISOString().slice(0, 10), to: fyEnd.toISOString().slice(0, 10) };
  }
  // fallback: this month
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
      style={{
        borderBottomColor: active ? "#1F2A38" : "transparent",
        color: active ? "#1F2A38" : "#5C6E81",
        fontFamily: "var(--font-montserrat)",
        borderRadius: 0,
        marginBottom: "-1px",
      }}
    >
      {children}
    </button>
  );
}

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PnLTab() {
  const supabase = createClient();
  const [period, setPeriod] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const range = period === "custom"
      ? { from: customFrom, to: customTo }
      : getPeriodRange(period);

    if (!range.from || !range.to) { setLoading(false); return; }

    const [{ data: invData }, { data: expData }] = await Promise.all([
      supabase.from("documents")
        .select("*")
        .eq("type", "invoice")
        .eq("status", "paid")
        .gte("issue_date", range.from)
        .lte("issue_date", range.to),
      supabase.from("expenses")
        .select("*")
        .gte("date", range.from)
        .lte("date", range.to),
    ]);
    setInvoices((invData ?? []) as Document[]);
    setExpenses((expData ?? []) as Expense[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalIncome = invoices.reduce((s, d) => s + (d.total ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount_incl_vat ?? 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // Group expenses by category
  const expByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.category ?? "Uncategorised";
    acc[cat] = (acc[cat] ?? 0) + (e.amount_incl_vat ?? 0);
    return acc;
  }, {});

  function exportCSV() {
    const rows: string[][] = [
      ["Type", "Description", "Amount"],
      ...invoices.map((d) => ["Income", d.number, String(d.total ?? 0)]),
      ["", "", ""],
      ...expenses.map((e) => ["Expense", e.description, String(e.amount_incl_vat ?? 0)]),
      ["", "", ""],
      ["NET PROFIT", "", String(netProfit)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pl-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "this_month",  label: "This Month" },
          { value: "last_month",  label: "Last Month" },
          { value: "this_quarter",label: "This Quarter" },
          { value: "this_fy",     label: "This FY" },
          { value: "last_fy",     label: "Last FY" },
          { value: "custom",      label: "Custom" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className="px-4 py-1.5 border text-xs transition-colors"
            style={{
              borderRadius: 0,
              fontFamily: "var(--font-montserrat)",
              borderColor: period === opt.value ? "#1F2A38" : "#EAE4DC",
              backgroundColor: period === opt.value ? "#1F2A38" : "white",
              color: period === opt.value ? "white" : "#5C6E81",
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={exportCSV}
          className="ml-auto px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
        >
          Export CSV
        </button>
      </div>

      {period === "custom" && (
        <div className="flex gap-4">
          <div className="w-48">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>From</label>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }} />
          </div>
          <div className="w-48">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>To</label>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }} />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
      ) : (
        <div className="bg-white border border-linen p-6 max-w-xl" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
          {/* INCOME */}
          <p className="text-xs text-steel uppercase tracking-widest mb-2 font-medium">Income</p>
          {invoices.length === 0 ? (
            <p className="text-sm text-steel mb-4">No paid invoices in this period.</p>
          ) : (
            <div className="space-y-1 mb-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex justify-between text-sm">
                  <span className="text-steel">{inv.number}</span>
                  <span className="text-ink">{formatZAR(inv.total ?? 0)}</span>
                </div>
              ))}
              <div className="border-t border-linen pt-1 flex justify-between text-sm font-medium">
                <span className="text-ink">Total Income</span>
                <span className="text-ink">{formatZAR(totalIncome)}</span>
              </div>
            </div>
          )}

          {/* EXPENSES */}
          <p className="text-xs text-steel uppercase tracking-widest mb-2 font-medium mt-4">Expenses</p>
          {Object.keys(expByCategory).length === 0 ? (
            <p className="text-sm text-steel mb-4">No expenses in this period.</p>
          ) : (
            <div className="space-y-1 mb-4">
              {Object.entries(expByCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-steel">{cat}</span>
                  <span className="text-ink">{formatZAR(amt)}</span>
                </div>
              ))}
              <div className="border-t border-linen pt-1 flex justify-between text-sm font-medium">
                <span className="text-ink">Total Expenses</span>
                <span className="text-ink">{formatZAR(totalExpenses)}</span>
              </div>
            </div>
          )}

          {/* NET */}
          <div className="border-t-2 border-navy pt-3 flex justify-between text-sm font-bold">
            <span className="text-navy">Net Profit / Loss</span>
            <span style={{ color: netProfit >= 0 ? "#16a34a" : "#dc2626" }}>{formatZAR(netProfit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cash Flow Tab ────────────────────────────────────────────────────────────

interface RetainerRow {
  id: string;
  name: string;
  monthly_amount: number;
  currency: string;
  status: string;
}

function CashFlowTab() {
  const supabase = createClient();
  const [days, setDays] = useState(30);
  const [outstandingInvoices, setOutstandingInvoices] = useState<(Document & { partner?: { company_name: string } })[]>([]);
  const [retainers, setRetainers] = useState<RetainerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const [{ data: invData }, { data: retData }] = await Promise.all([
        supabase.from("documents")
          .select("*, partner:partners(company_name)")
          .eq("type", "invoice")
          .in("status", ["sent", "overdue", "partially_paid"])
          .lte("due_date", cutoff.toISOString().slice(0, 10)),
        supabase.from("retainers")
          .select("id, name, monthly_amount, currency, status")
          .eq("status", "active"),
      ]);
      setOutstandingInvoices((invData ?? []) as (Document & { partner?: { company_name: string } })[]);
      setRetainers((retData ?? []) as RetainerRow[]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const totalInflows = outstandingInvoices.reduce((s, d) => s + (d.total ?? 0), 0);
  const monthlyRetainerCost = retainers.reduce((s, r) => s + r.monthly_amount, 0);
  const projectedMonths = days / 30;
  const totalOutflows = monthlyRetainerCost * projectedMonths;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[30, 60, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className="px-4 py-1.5 border text-xs transition-colors"
            style={{
              borderRadius: 0, fontFamily: "var(--font-montserrat)",
              borderColor: days === d ? "#1F2A38" : "#EAE4DC",
              backgroundColor: days === d ? "#1F2A38" : "white",
              color: days === d ? "white" : "#5C6E81",
            }}
          >
            {d}-day
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Inflows */}
          <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
            <div className="px-4 py-3 border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
              <p className="text-xs text-steel uppercase tracking-widest font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                Expected Inflows (next {days} days)
              </p>
            </div>
            {outstandingInvoices.length === 0 ? (
              <p className="px-4 py-4 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>None expected.</p>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <tbody>
                  {outstandingInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-linen last:border-0">
                      <td className="px-4 py-2 text-ink">{inv.number}</td>
                      <td className="px-4 py-2 text-steel">{(inv as Document & { partner?: { company_name: string } }).partner?.company_name ?? "—"}</td>
                      <td className="px-4 py-2 text-steel">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-2 text-ink text-right">{formatZAR(inv.total ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-navy">
                    <td colSpan={3} className="px-4 py-2 font-bold text-navy text-xs uppercase tracking-wider">Total</td>
                    <td className="px-4 py-2 font-bold text-navy text-right">{formatZAR(totalInflows)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Outflows — retainer-based projections */}
          <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
            <div className="px-4 py-3 border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
              <p className="text-xs text-steel uppercase tracking-widest font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                Projected Outflows — Active Retainers ({Math.round(projectedMonths * 10) / 10} months)
              </p>
            </div>
            {retainers.length === 0 ? (
              <p className="px-4 py-4 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No active retainers.</p>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <tbody>
                  {retainers.map((ret) => (
                    <tr key={ret.id} className="border-b border-linen last:border-0">
                      <td className="px-4 py-2 text-ink">{ret.name}</td>
                      <td className="px-4 py-2 text-steel">
                        {formatZAR(ret.monthly_amount)}/mo
                      </td>
                      <td className="px-4 py-2 text-ink text-right">
                        {formatZAR(ret.monthly_amount * projectedMonths)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-navy">
                    <td colSpan={2} className="px-4 py-2 font-bold text-navy text-xs uppercase tracking-wider">Total</td>
                    <td className="px-4 py-2 font-bold text-navy text-right">{formatZAR(totalOutflows)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-linen p-5 max-w-sm" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
        <div className="flex justify-between text-sm">
          <span className="text-steel">Expected Inflows</span>
          <span className="text-ink">{formatZAR(totalInflows)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-steel">Projected Outflows (retainers)</span>
          <span className="text-ink">({formatZAR(totalOutflows)})</span>
        </div>
        <div className="border-t border-linen mt-2 pt-2 flex justify-between font-bold text-sm">
          <span className="text-navy">Net Cash Flow Projection</span>
          <span style={{ color: (totalInflows - totalOutflows) >= 0 ? "#16a34a" : "#dc2626" }}>
            {formatZAR(totalInflows - totalOutflows)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Drawings Tab ─────────────────────────────────────────────────────────────

function DrawingsTab() {
  const supabase = createClient();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ owner_id: "", date: "", amount: "", method: "", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: drawData }, { data: ownerData }] = await Promise.all([
      supabase.from("drawings").select("*").order("date", { ascending: false }),
      supabase.from("owner_settings").select("*").order("display_name"),
    ]);
    setDrawings((drawData ?? []) as Drawing[]);
    setOwners((ownerData ?? []) as OwnerSettings[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) { setFormError("Amount is required."); return; }
    if (!form.date) { setFormError("Date is required."); return; }
    setSaving(true); setFormError(null);
    const { error } = await supabase.from("drawings").insert({
      owner_id: form.owner_id || null,
      date: form.date,
      amount: parseFloat(form.amount),
      method: form.method || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setForm({ owner_id: "", date: "", amount: "", method: "", reference: "", notes: "" });
    setShowForm(false);
    await loadData();
  }

  // YTD per owner
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const ytdByOwner = owners.reduce<Record<string, number>>((acc, o) => {
    const total = drawings
      .filter((d) => d.owner_id === o.id && d.date >= ytdStart)
      .reduce((s, d) => s + d.amount, 0);
    acc[o.id] = total;
    return acc;
  }, {});

  const ownerName = (id: string | null) => {
    if (!id) return "—";
    const o = owners.find((o) => o.id === id);
    return o?.display_name ?? o?.initials ?? id;
  };

  return (
    <div className="space-y-6">
      {/* YTD per owner */}
      {owners.length > 0 && (
        <div className="flex gap-4">
          {owners.map((o) => (
            <div key={o.id} className="bg-white border border-linen p-4" style={{ borderRadius: 0 }}>
              <p className="text-xs text-steel uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                {o.display_name ?? o.initials} — YTD Drawings
              </p>
              <p className="text-navy font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>
                {formatZAR(ytdByOwner[o.id] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {showForm ? "Cancel" : "+ Add Drawing"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave}>
          <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner</label>
                <select
                  value={form.owner_id} onChange={(e) => handleChange("owner_id", e.target.value)}
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  <option value="">— Select —</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Date *</label>
                <input
                  type="date" required value={form.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount (R) *</label>
                <input
                  type="number" min="0" step="any" required value={form.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Method</label>
                <select
                  value={form.method} onChange={(e) => handleChange("method", e.target.value)}
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  <option value="">— Select —</option>
                  <option value="EFT">EFT</option>
                  <option value="Offset">Offset</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Reference</label>
                <input
                  type="text" value={form.reference}
                  onChange={(e) => handleChange("reference", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
                <input
                  type="text" value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
            </div>
            {formError && <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{formError}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {saving ? "Saving…" : "Save Drawing"}
              </button>
              <button
                type="button" onClick={() => { setShowForm(false); setFormError(null); }}
                className="text-sm text-steel hover:text-navy transition-colors"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
        {loading ? (
          <p className="px-4 py-6 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : drawings.length === 0 ? (
          <p className="px-4 py-8 text-center text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No drawings recorded yet.</p>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <thead>
              <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Owner</th>
                <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Method</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Reference</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {drawings.map((d) => (
                <tr key={d.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                  <td className="px-4 py-3 text-steel whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-4 py-3 text-ink">{ownerName(d.owner_id)}</td>
                  <td className="px-4 py-3 text-ink text-right font-medium">{formatZAR(d.amount)}</td>
                  <td className="px-4 py-3 text-steel">{d.method ?? "—"}</td>
                  <td className="px-4 py-3 text-steel">{d.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-steel">{d.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Per-Client Tab ───────────────────────────────────────────────────────────

function PerPartnerTab() {
  const supabase = createClient();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<{
    invoiced: number;
    paid: number;
    outstanding: number;
    expenses: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("partners").select("id, company_name").order("company_name").then(({ data }) => {
      setPartners((data ?? []) as Partner[]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) { setData(null); return; }
    setLoading(true);
    Promise.all([
      supabase.from("documents").select("status, total").eq("partner_id", selectedId).eq("type", "invoice"),
      supabase.from("expenses").select("amount_incl_vat").eq("partner_id", selectedId),
    ]).then(([{ data: invData }, { data: expData }]) => {
      const invs = invData ?? [];
      const invoiced = invs.reduce((s: number, d: { total: number | null }) => s + (d.total ?? 0), 0);
      const paid = invs.filter((d: { status: string }) => d.status === "paid").reduce((s: number, d: { total: number | null }) => s + (d.total ?? 0), 0);
      const outstanding = invs.filter((d: { status: string }) => ["sent", "overdue"].includes(d.status)).reduce((s: number, d: { total: number | null }) => s + (d.total ?? 0), 0);
      const expenses = (expData ?? []).reduce((s: number, e: { amount_incl_vat: number | null }) => s + (e.amount_incl_vat ?? 0), 0);
      setData({ invoiced, paid, outstanding, expenses });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const margin = data ? data.paid - data.expenses : 0;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Select Partner</label>
        <select
          value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="border border-linen bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy w-full"
          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
        >
          <option value="">— Select partner —</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
        </select>
      </div>

      {loading && <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>}

      {data && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
          {[
            { label: "Total Invoiced",  value: formatZAR(data.invoiced) },
            { label: "Total Paid",      value: formatZAR(data.paid) },
            { label: "Outstanding",     value: formatZAR(data.outstanding) },
            { label: "Partner Expenses", value: formatZAR(data.expenses) },
            { label: "Net Margin",      value: formatZAR(margin), highlight: true, positive: margin >= 0 },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-linen p-5 flex flex-col gap-1" style={{ borderRadius: 0 }}>
              <span className="text-xs text-steel uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
                {card.label}
              </span>
              <span
                className="font-bold text-lg"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: card.highlight ? (card.positive ? "#16a34a" : "#dc2626") : "#1F2A38",
                }}
              >
                {card.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("pl");

  const tabs = [
    { value: "pl",            label: "P&L" },
    { value: "cashflow",      label: "Cash Flow Projection" },
    { value: "drawings",      label: "Drawings" },
    { value: "per_partner",   label: "Per-Partner" },
    { value: "aging",         label: "AR Aging",      href: "/admin/reports/aging" },
    { value: "balance_sheet", label: "Balance Sheet", href: "/admin/reports/balance-sheet" },
    { value: "vat",           label: "VAT Report",    href: "/admin/reports/vat" },
  ];

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Reports</h2>
      </div>

      <main className="pt-[56px] p-8">
        {/* Tab nav */}
        <div className="border-b border-linen mb-6">
          <div className="flex gap-0 -mb-px" role="tablist">
            {tabs.map((t) => (
              <TabButton
                key={t.value}
                active={tab === t.value}
                onClick={() => {
                  if (t.href) {
                    router.push(t.href);
                  } else {
                    setTab(t.value);
                  }
                }}
              >
                {t.label}
              </TabButton>
            ))}
          </div>
        </div>

        {tab === "pl"          && <PnLTab />}
        {tab === "cashflow"    && <CashFlowTab />}
        {tab === "drawings"    && <DrawingsTab />}
        {tab === "per_partner" && <PerPartnerTab />}
      </main>
    </>
  );
}
